/**
 * Static reference data for pre-filled, searchable form dropdowns.
 *
 * These are UI lookups only — the backend stores the chosen string. Lists err on
 * the side of completeness so custom entry is rarely needed, but Combobox still
 * allows a free-typed value for anything not listed here.
 */

export interface Option {
  value: string;
  label: string;
}

const toOptions = (values: string[]): Option[] =>
  values.map((v) => ({ value: v, label: v }));

/** Default selections requested for the student intake flow. */
export const DEFAULT_NATIONALITY = "Indian";
export const DEFAULT_MOTHER_TONGUE = "Gujarati";

/** Indian states + union territories (as of 2020 reorganisation). */
export const INDIAN_STATES: Option[] = toOptions([
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  // Union territories
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
]);

/**
 * Languages — the 22 scheduled languages of India first (most relevant for the
 * mother-tongue field), followed by other commonly seen options.
 */
export const LANGUAGES: Option[] = toOptions([
  "Gujarati",
  "Hindi",
  "Assamese",
  "Bengali",
  "Bodo",
  "Dogri",
  "Kannada",
  "Kashmiri",
  "Konkani",
  "Maithili",
  "Malayalam",
  "Manipuri",
  "Marathi",
  "Nepali",
  "Odia",
  "Punjabi",
  "Sanskrit",
  "Santali",
  "Sindhi",
  "Tamil",
  "Telugu",
  "Urdu",
  // Other commonly used
  "English",
  "Arabic",
  "Bhojpuri",
  "Tulu",
  "Other",
]);

/**
 * Nationalities (demonyms). "Indian" first since it is the default and the vast
 * majority of records; the rest is an alphabetical world list.
 */
export const NATIONALITIES: Option[] = toOptions([
  "Indian",
  "Afghan",
  "American",
  "Australian",
  "Bangladeshi",
  "Bhutanese",
  "Brazilian",
  "British",
  "Canadian",
  "Chinese",
  "Egyptian",
  "Emirati",
  "Ethiopian",
  "French",
  "German",
  "Indonesian",
  "Iranian",
  "Iraqi",
  "Irish",
  "Italian",
  "Japanese",
  "Kenyan",
  "Malaysian",
  "Maldivian",
  "Myanmarese",
  "Nepali",
  "New Zealander",
  "Nigerian",
  "Pakistani",
  "Filipino",
  "Qatari",
  "Russian",
  "Saudi",
  "Singaporean",
  "South African",
  "South Korean",
  "Spanish",
  "Sri Lankan",
  "Thai",
  "Turkish",
  "Ugandan",
  "Other",
]);
