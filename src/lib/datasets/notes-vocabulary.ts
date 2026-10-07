/**
 * The fixed 2,000-word vocabulary of the NOTES case (Part C, C6), organized
 * by slot. The slot of a word decides two things: its base weight in the
 * class-conditional word distributions (`notes.ts`), and where it is placed
 * when a sampled bag of words is rendered as a readable report.
 *
 * Word lists are curated real words; drug names are synthetic, built
 * deterministically from INN-style prefixes and stems so that no real
 * product appears in a synthetic adverse-event report. The number of drug
 * names is whatever brings the vocabulary to exactly `VOCABULARY_SIZE`.
 *
 * The exported `VOCABULARY` is sorted alphabetically, matching the column
 * order `CountVectorizer` would give it (lesson 6.2).
 */

export const VOCABULARY_SIZE = 2000;

export type Slot =
  | 'function'
  | 'serious'
  | 'nonserious'
  | 'symptom'
  | 'anatomy'
  | 'lab'
  | 'procedure'
  | 'descriptor'
  | 'verb'
  | 'time'
  | 'number'
  | 'history'
  | 'misc'
  | 'drug';

const FUNCTION = `patient the a an and of in on at to with after before during following since for from
was were is be been has had have no not this that these which who her his she he they their it its
also then later now still again per by as or but if when while until about over under between
without within both each any some more most less very well day days week weeks month months hour
hours year years old male female man woman age aged reported reports report noted notes states
stated developed experienced presented started starting began stopped taking took given received
dose doses drug medication therapy treatment tablet tablets mg daily twice once morning evening
night course event events reaction reactions onset outcome history physician nurse pharmacist
clinic visit`;

const SERIOUS = `hospitalized hospitalization admitted admission syncope arrhythmia icu intensive
discontinued discontinuation emergency resuscitation intubated intubation ventilator collapse
collapsed unresponsive seizure seizures anaphylaxis anaphylactic infarction stroke hemorrhage
sepsis shock arrest cardiac fatal death died deceased threatening disability transfusion dialysis
failure hepatic acute severe critical urgent ambulance surgery surgical withdrawn permanently
pacemaker defibrillator ventricular tachycardia bradycardia fibrillation hyperkalemia hypotension
coma delirium overdose rhabdomyolysis pancreatitis angioedema embolism thrombosis`;

const NONSERIOUS = `mild headache resolved nausea transient minor dizziness fatigue tired drowsy
drowsiness itching rash dry mouth cough sneezing runny constipation bloating indigestion heartburn
flushing sweating insomnia restless irritability appetite taste metallic bruising tenderness
injection site redness swelling stiffness soreness aching cramp cramps tingling numbness blurred
ringing spontaneously uneventful tolerated continued continuing unchanged improved improving
subsided settled recovered recovery reassured advised monitoring outpatient telephone brief
self limiting lightheaded queasy sleepy`;

const SYMPTOM = `pain ache fever chills sweats malaise weakness lethargy confusion agitation anxiety
depression mood tremor shaking palpitations fluttering breathlessness dyspnea wheeze wheezing
stridor hoarseness sore throat congestion sinus pressure tightness heaviness discomfort burning
stinging prickling pins needles vertigo imbalance unsteady fall falls fainting faint presyncope
blackout vomiting vomited retching diarrhea loose stools stool melena hematemesis reflux dyspepsia
fullness distension flatulence hiccups dysphagia choking anorexia weight gain loss thirst polyuria
nocturia dysuria frequency urgency incontinence retention hematuria oliguria anuria edema swollen
puffiness pitting ulcer blister blisters hives urticaria wheal wheals eruption erythema pallor
cyanosis jaundice icterus pruritus desquamation peeling photosensitivity sunburn alopecia hair
thinning acne dermatitis eczema psoriasis lesion lesions nodule nodules lump mass bump abscess
cellulitis infection infected pus discharge drainage wound laceration fracture sprain strain
spasm spasms twitching jerking convulsion convulsions fit fits stupor obtundation somnolence
stupor hallucination hallucinations paranoia nightmares vivid dreams forgetfulness memory
disorientation slurred speech aphasia dysarthria diplopia photophobia floaters flashes scotoma
blindness deafness tinnitus earache otalgia epistaxis nosebleed gingival bleeding gums toothache
jaw lockjaw trismus stiff neck meningism rigidity bradykinesia dyskinesia chorea tics myalgia
arthralgia arthritis gout backache sciatica neuropathy paresthesia dysesthesia allodynia
hyperesthesia hypoesthesia claudication coldness clammy diaphoresis flush flushed hot cold shiver
rigors chest angina pleuritic palpitation irregular skipped beats racing pounding thumping
hypertension hypotensive hypertensive crisis syncopal orthostatic postural dehydration
hypoglycemia hyperglycemia ketoacidosis hyponatremia hypokalemia hypocalcemia hypomagnesemia
acidosis alkalosis anemia neutropenia thrombocytopenia leukopenia pancytopenia agranulocytosis
eosinophilia lymphadenopathy splenomegaly hepatomegaly hepatitis cholestasis cholecystitis
nephritis nephrotoxicity proteinuria pyelonephritis cystitis prostatitis vaginitis candidiasis
thrush herpes zoster shingles pneumonia bronchitis pharyngitis laryngitis tonsillitis sinusitis
rhinitis conjunctivitis uveitis keratitis otitis gastritis colitis enteritis esophagitis
stomatitis mucositis glossitis cheilitis parotitis sialadenitis lymphedema phlebitis vasculitis
myocarditis pericarditis endocarditis cardiomyopathy ischemia infarct`;

const ANATOMY = `head scalp face forehead eye eyes eyelid pupil retina ear ears nose nostril lip lips
tongue teeth gum cheek chin throat larynx pharynx trachea neck shoulder shoulders arm arms elbow
forearm wrist hand hands finger fingers thumb nail nails chest breast rib ribs sternum back spine
lumbar thoracic cervical hip hips pelvis groin thigh knee knees calf shin ankle ankles foot feet
toe toes heel sole skin dermis hair follicle abdomen belly stomach epigastrium flank umbilicus
liver gallbladder pancreas spleen kidney kidneys bladder urethra ureter bowel colon rectum anus
intestine duodenum esophagus heart ventricle atrium valve aorta artery arteries vein veins
capillary lung lungs bronchus bronchi alveoli pleura diaphragm muscle muscles tendon ligament
joint joints bone bones marrow cartilage nerve nerves brain cerebellum brainstem cortex meninges
cranial thyroid adrenal pituitary ovary uterus cervix prostate testis scrotum penis vagina
lymph node nodes gland glands mucosa membrane tissue`;

const LAB = `potassium sodium chloride bicarbonate calcium magnesium phosphate glucose creatinine
urea bun egfr clearance albumin protein globulin bilirubin alt ast alp ggt ldh amylase lipase
troponin ck ckmb bnp crp esr ferritin iron transferrin hemoglobin hematocrit platelet platelets
wbc neutrophil neutrophils lymphocyte lymphocytes eosinophil monocyte basophil rbc mcv mch inr
pt ptt aptt fibrinogen ddimer lactate ammonia cortisol tsh thyroxine glycated cholesterol ldl hdl
triglycerides uric urate ph saturation oximetry oxygen pulse rate rhythm bp systolic
diastolic temperature temp weight height bmi urinalysis urine culture cultures blood sample
specimen level levels value values result results elevated raised increased decreased reduced
low high normal abnormal borderline critical trace positive negative mmol umol dl ml ng pg
iu units percent ratio`;

const PROCEDURE = `ecg ekg echocardiogram echo telemetry monitor holter xray radiograph ct mri
ultrasound scan imaging angiogram angiography catheterization catheter stent angioplasty bypass
endoscopy colonoscopy gastroscopy bronchoscopy biopsy aspiration lumbar puncture dialysis
hemodialysis infusion drip iv intravenous oral subcutaneous intramuscular topical inhaled
nebulizer inhaler oxygen mask cannula ventilation cpap bipap intubation extubation sedation
anesthesia anesthetic operation procedure incision suture dressing bandage splint cast brace
physiotherapy rehabilitation rehab consult consultation referral referred review reviewed
assessment assessed examination examined observation observed ward bed unit department ed er
triage ambulatory admission discharge discharged transfer transferred pharmacy prescription
prescribed dispensed refill supply pack blister label dosing titration taper tapered weaned`;

const DESCRIPTOR = `sudden gradual rapid slow progressive persistent intermittent constant recurrent
episodic occasional frequent rare new worsening worse better best stable unstable moderate
marked significant slight slightly noticeable noticeably pronounced profound extreme intense
excruciating dull sharp stabbing throbbing cramping colicky gnawing squeezing crushing tearing
radiating localized generalized diffuse widespread bilateral unilateral left right upper lower
central peripheral proximal distal anterior posterior medial lateral superficial deep tender
warm swollen erythematous pale cyanotic jaundiced dusky mottled blotchy scaly flaky crusted
weeping oozing itchy prickly numb tingly heavy light dizzy nauseous nauseated feverish febrile
afebrile alert oriented confused agitated anxious tearful calm comfortable uncomfortable
distressed lethargic drowsy sleepy restless fatigued weak frail unwell poorly unresponsive
responsive conscious unconscious coherent incoherent abrupt immediate delayed early late
prolonged short brief lengthy ongoing resolving resolved unresolved complete partial full
total likely unlikely possible probable possibly probably definitely certainly apparently
suspected confirmed unconfirmed presumed unknown unclear related unrelated causal coincidental
expected unexpected serious nonserious tolerable intolerable manageable unmanageable`;

const VERB = `complains complained complaining denies denied describes described describing feels
felt feeling appears appeared appearing seems seemed presents presenting attends attended
attending visits visited calls called phoned contacted returned returning requires required
requiring needs needed receives receiving takes taken given administered administering
administer prescribe prescribing dispense withhold withheld hold held paused pausing restarted
restarting resumed resuming reduced reducing increased increasing titrated switched switching
changed changing replaced replacing added adding removed removing avoid avoided avoiding tolerate
tolerating tolerates suffers suffered suffering develops developing experiences experiencing
occurs occurred occurring begins beginning starts ends ended ending lasts lasted lasting persists
persisted persisting worsens worsened improves improves recovers recovering resolves resolving
responds responded responding reacts reacted reacting treats treated treating manages managed
managing monitors monitored evaluates evaluated evaluating investigates investigated investigating
finds found finding shows showed showing reveals revealed revealing confirms confirmed confirming
suggests suggested suggesting indicates indicated indicating considers considered considering
recommends recommended recommending advises advising instructs instructed instructing informs
informed informing explains explained explaining discusses discussed discussing agrees agreed
declines declined refuses refused accepts accepted consents consented`;

const TIME = `today yesterday tonight overnight minutes minute seconds second hourly nightly weekly
monthly yearly annually shortly soon immediately instantly promptly eventually finally initially
previously formerly recently lately currently presently meanwhile subsequently afterwards afterward
thereafter earlier prior ago next last first final second third fourth fifth sixth seventh eighth
ninth tenth dawn noon midday midnight afternoon bedtime mealtime breakfast lunch dinner fasting
postprandial preoperative postoperative baseline interim`;

const NUMBER = `one two three four five six seven eight nine ten eleven twelve thirteen fourteen
fifteen sixteen seventeen eighteen nineteen twenty thirty forty fifty sixty seventy eighty ninety
hundred thousand half quarter double triple several few many numerous single multiple`;

const HISTORY = `diabetes diabetic hypertensive asthma asthmatic copd smoker nonsmoker smoking
alcohol alcoholic obesity obese overweight pregnant pregnancy breastfeeding lactating menopausal
elderly geriatric pediatric child infant adolescent adult allergy allergies allergic intolerance
intolerant sensitivity sensitive family familial genetic hereditary chronic longstanding
comorbid comorbidity comorbidities background underlying concurrent concomitant coadministered
interaction interacting polypharmacy adherence adherent nonadherent compliance compliant
missed skipped forgot forgotten extra accidental intentional deliberate error dosing mistake
wrong incorrect correct appropriate inappropriate contraindicated indicated indication
offlabel trial study protocol enrolled randomized placebo blinded investigator sponsor
site visit screening followup lost withdrew withdrawal consent eligible ineligible`;

const MISC = `because therefore however although though despite whereas otherwise thus hence
nevertheless nonetheless furthermore moreover additionally besides instead rather quite rather
somewhat fairly almost nearly roughly approximately exactly precisely around near far away
here there where everywhere nowhere somewhere anyway anyhow meanwhile whether either neither
nor yet so such only just even ever never always sometimes often seldom rarely usually
generally typically normally commonly frequently mostly mainly largely partly entirely wholly
completely totally fully barely hardly scarcely merely simply surely truly really actually
literally practically virtually essentially basically obviously clearly evidently notably
particularly especially specifically namely including excluding regarding concerning
according overall altogether together apart alone itself himself herself themselves oneself
someone anyone everyone nobody nothing something anything everything none all whole part
piece bit lot plenty amount number quantity degree extent level stage phase step period
spell bout episode attack flare flareup relapse remission plateau peak trough nadir
onset offset start finish end beginning middle duration interval gap delay lag`;

/** INN-style synthetic drug name parts; combined in order until the vocabulary is full. */
const DRUG_PREFIX = `val rel tor ami ben cel dar ebr fal gol hib ira jol kem lom mer nor ovi pax
quil ris sab tam ulo ves wol xan yor zel`.split(/\s+/);
const DRUG_STEM = `o a i e u`.split(/\s+/);
const DRUG_SUFFIX = `mab nib pril sartan olol statin azole cillin mycin vir tide parin afil oxetine
azepam ipine lukast tinib zumab setron triptan prazole gliptin flozin cept`.split(/\s+/);

function words(block: string): string[] {
  return block.split(/\s+/).filter((w) => w.length > 0);
}

const CURATED: Record<Exclude<Slot, 'drug'>, string[]> = {
  function: words(FUNCTION),
  serious: words(SERIOUS),
  nonserious: words(NONSERIOUS),
  symptom: words(SYMPTOM),
  anatomy: words(ANATOMY),
  lab: words(LAB),
  procedure: words(PROCEDURE),
  descriptor: words(DESCRIPTOR),
  verb: words(VERB),
  time: words(TIME),
  number: words(NUMBER),
  history: words(HISTORY),
  misc: words(MISC),
};

/** Slot precedence when a word is listed in two slots (the first wins). */
const SLOT_ORDER: readonly Slot[] = [
  'function',
  'serious',
  'nonserious',
  'symptom',
  'anatomy',
  'lab',
  'procedure',
  'descriptor',
  'verb',
  'time',
  'number',
  'history',
  'misc',
  'drug',
];

function buildVocabulary(): { slotOf: Map<string, Slot>; bySlot: Map<Slot, string[]> } {
  const slotOf = new Map<string, Slot>();
  const bySlot = new Map<Slot, string[]>();
  for (const slot of SLOT_ORDER) bySlot.set(slot, []);

  for (const slot of SLOT_ORDER) {
    if (slot === 'drug') continue;
    for (const w of CURATED[slot]) {
      if (!/^[a-z]+$/.test(w)) throw new Error(`notes vocabulary: "${w}" is not a lowercase word`);
      if (slotOf.has(w)) continue; // the first slot keeps the word
      slotOf.set(w, slot);
      bySlot.get(slot)?.push(w);
    }
  }

  const drugs = bySlot.get('drug') ?? [];
  outer: for (const suffix of DRUG_SUFFIX) {
    for (const prefix of DRUG_PREFIX) {
      for (const stem of DRUG_STEM) {
        if (slotOf.size >= VOCABULARY_SIZE) break outer;
        const name = `${prefix}${stem}${suffix}`;
        if (slotOf.has(name)) continue;
        slotOf.set(name, 'drug');
        drugs.push(name);
      }
    }
  }
  if (slotOf.size !== VOCABULARY_SIZE) {
    throw new Error(
      `notes vocabulary: ${slotOf.size} words, expected ${VOCABULARY_SIZE} (curated lists too long or drug parts too few)`,
    );
  }
  return { slotOf, bySlot };
}

const built = buildVocabulary();

/** Alphabetical vocabulary; `VOCABULARY[j]` is word j of the bag-of-words vector. */
export const VOCABULARY: readonly string[] = [...built.slotOf.keys()].sort();

/** Column index of a word, or undefined if it is out of vocabulary. */
export const WORD_INDEX: ReadonlyMap<string, number> = new Map(
  VOCABULARY.map((w, j) => [w, j] as const),
);

/** Slot of each vocabulary word. */
export function slotOf(word: string): Slot {
  const s = built.slotOf.get(word);
  if (!s) throw new Error(`notes vocabulary: unknown word "${word}"`);
  return s;
}

/** Words of a slot, in curated (not alphabetical) order; the first words are the most typical. */
export function wordsOfSlot(slot: Slot): readonly string[] {
  return built.bySlot.get(slot) ?? [];
}

export const SLOTS: readonly Slot[] = SLOT_ORDER;
