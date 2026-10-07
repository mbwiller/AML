/**
 * Custom Astro content-layer loaders for the YAML collections that the
 * built-in `file()` loader does not fit:
 *
 * - `yamlListLoader`: one YAML file holding a list (graph nodes, graph edges).
 *   A missing file yields an empty collection instead of a build error, so the
 *   platform builds before the content developer has written the graph.
 * - `yamlListDirLoader`: a directory of YAML files, each holding a list
 *   (quizzes, flashcards). Every item becomes one entry; the file's base name
 *   (the unit slug) is written into `data.unit`.
 *
 * Both validate through `parseData`, so the collection schema applies, and
 * both re-sync on file changes in `astro dev`.
 */
import { existsSync, promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { Loader, LoaderContext } from "astro/loaders";
import { parse as parseYaml } from "yaml";

type Item = Record<string, unknown>;

function posixRelative(from: string, to: string): string {
  return path.relative(from, to).split(path.sep).join("/");
}

function readList(
  text: string,
  label: string,
  logger: LoaderContext["logger"],
): Item[] {
  let raw: unknown;
  try {
    raw = parseYaml(text);
  } catch (e) {
    logger.error(
      `${label}: YAML parse error: ${(e as Error).message.split("\n")[0] ?? ""}`,
    );
    return [];
  }
  if (raw === null || raw === undefined) return [];
  if (!Array.isArray(raw)) {
    logger.error(`${label}: expected a YAML list`);
    return [];
  }
  return raw.filter((x): x is Item => typeof x === "object" && x !== null);
}

export interface YamlListLoaderOptions {
  /** Path relative to the project root, e.g. `src/content/graph/nodes.yaml`. */
  file: string;
  /** Entry id for an item (defaults to `item.id`). */
  idOf?: (item: Item, index: number) => string | undefined;
}

export function yamlListLoader(options: YamlListLoaderOptions): Loader {
  const idOf =
    options.idOf ??
    ((item: Item) => (typeof item["id"] === "string" ? item["id"] : undefined));
  return {
    name: "aml-yaml-list",
    load: async (context) => {
      const { store, parseData, logger, config, watcher } = context;
      const abs = fileURLToPath(new URL(options.file, config.root));
      const rel = posixRelative(fileURLToPath(config.root), abs);

      const sync = async () => {
        store.clear();
        if (!existsSync(abs)) {
          logger.info(
            `${options.file} not found; ${context.collection} is empty`,
          );
          return;
        }
        const text = await fs.readFile(abs, "utf-8");
        const items = readList(text, options.file, logger);
        const seen = new Set<string>();
        for (const [index, item] of items.entries()) {
          const id = idOf(item, index);
          if (!id) {
            logger.error(`${options.file}: item ${index + 1} has no id`);
            continue;
          }
          if (seen.has(id)) {
            logger.error(`${options.file}: duplicate id "${id}"`);
            continue;
          }
          seen.add(id);
          const data = await parseData({ id, data: item, filePath: abs });
          store.set({
            id,
            data,
            filePath: rel,
            digest: context.generateDigest(data),
          });
        }
        logger.debug(`${options.file}: ${seen.size} entries`);
      };

      await sync();

      if (watcher) {
        watcher.add(abs);
        const onChange = (changed: string) => {
          if (path.resolve(changed) !== abs) return;
          sync().catch((e: unknown) => logger.error(String(e)));
        };
        watcher.on("change", onChange);
        watcher.on("add", onChange);
        watcher.on("unlink", onChange);
      }
    },
  };
}

export interface YamlListDirLoaderOptions {
  /** Directory relative to the project root, e.g. `src/content/quizzes`. */
  dir: string;
  /** Name of the field that receives the file's base name (default `unit`). */
  fileField?: string;
  idOf?: (item: Item, index: number) => string | undefined;
}

export function yamlListDirLoader(options: YamlListDirLoaderOptions): Loader {
  const fileField = options.fileField ?? "unit";
  const idOf =
    options.idOf ??
    ((item: Item) => (typeof item["id"] === "string" ? item["id"] : undefined));
  return {
    name: "aml-yaml-list-dir",
    load: async (context) => {
      const { store, parseData, logger, config, watcher } = context;
      const root = fileURLToPath(config.root);
      const absDir = fileURLToPath(
        new URL(`${options.dir.replace(/\/$/, "")}/`, config.root),
      );

      const sync = async () => {
        store.clear();
        if (!existsSync(absDir)) {
          logger.info(
            `${options.dir} not found; ${context.collection} is empty`,
          );
          return;
        }
        const names = (await fs.readdir(absDir))
          .filter((n) => /\.ya?ml$/.test(n) && !n.startsWith("."))
          .sort();
        const seen = new Map<string, string>();
        for (const name of names) {
          const abs = path.join(absDir, name);
          const rel = posixRelative(root, abs);
          const base = name.replace(/\.ya?ml$/, "");
          const text = await fs.readFile(abs, "utf-8");
          const items = readList(text, rel, logger);
          for (const [index, item] of items.entries()) {
            const id = idOf(item, index);
            if (!id) {
              logger.error(`${rel}: item ${index + 1} has no id`);
              continue;
            }
            const prev = seen.get(id);
            if (prev) {
              logger.error(`${rel}: duplicate id "${id}" (also in ${prev})`);
              continue;
            }
            seen.set(id, rel);
            const data = await parseData({
              id,
              data: { ...item, [fileField]: base },
              filePath: abs,
            });
            store.set({
              id,
              data,
              filePath: rel,
              digest: context.generateDigest(data),
            });
          }
        }
        logger.debug(
          `${options.dir}: ${seen.size} entries from ${names.length} files`,
        );
      };

      await sync();

      if (watcher) {
        watcher.add(absDir);
        const onChange = (changed: string) => {
          const abs = path.resolve(changed);
          if (!abs.startsWith(absDir) || !/\.ya?ml$/.test(abs)) return;
          sync().catch((e: unknown) => logger.error(String(e)));
        };
        watcher.on("change", onChange);
        watcher.on("add", onChange);
        watcher.on("unlink", onChange);
      }
    },
  };
}
