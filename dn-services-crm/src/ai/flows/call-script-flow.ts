import { z } from 'zod';
import { callClaude } from '@/ai/anthropic';

const CallScriptInputSchema = z.object({
  name: z.string(),
  jobTitle: z.string().optional(),
  industry: z.string().optional(),
  status: z.enum(['new', 'canva', 'probable', 'likely_sale', 'likely_antisale', 'another_time', 'email', 'not_buying', 'no_answer', 'bought', 'few_reviews', 'left', 'return']),
  investmentAmount: z.number(),
  observations: z.string().optional(),
  language: z.enum(['el', 'en']).default('el'),
});
export type CallScriptInput = z.infer<typeof CallScriptInputSchema>;

const CallScriptOutputSchema = z.object({
  greeting: z.string(),
  pitch: z.string(),
  objections: z.array(z.object({ objection: z.string(), answer: z.string() })),
  closing: z.string(),
});
export type CallScriptOutput = z.infer<typeof CallScriptOutputSchema>;

export async function generateCallScript(input: CallScriptInput): Promise<CallScriptOutput> {
  const isEl = input.language === 'el';
  const statusCtx = ({
    new:             isEl ? 'πρώτη επαφή, δεν γνωρίζει τη εταιρεία' : 'first contact, unfamiliar with company',
    canva:           isEl ? 'επαφή από canvas/εκστρατεία, χρειάζεται εισαγωγή στις επενδυτικές υπηρεσίες' : 'canvas/campaign contact, needs introduction to investment services',
    probable:        isEl ? 'πιθανός ενδιαφερόμενος, χρειάζεται επιβεβαίωση ενδιαφέροντος' : 'probable buyer, needs interest confirmation',
    likely_sale:     isEl ? 'πιθανός αγοραστής κατηγορίας Sale, κοντά στην απόφαση' : 'likely buyer (Sale category), near decision',
    likely_antisale: isEl ? 'πιθανός αγοραστής κατηγορίας Antisale, χρειάζεται πειστικά επιχειρήματα' : 'likely buyer (Antisale category), needs persuasion',
    another_time:    isEl ? 'ζήτησε επικοινωνία άλλη στιγμή, χρειάζεται follow-up σε νέο χρόνο' : 'requested callback at another time, schedule follow-up',
    email:           isEl ? 'επικοινωνία μέσω email, προετοιμάστε follow-up call μετά το email' : 'email contact, prepare follow-up call after email',
    no_answer:       isEl ? 'δεν απάντησε στην κλήση, χρειάζεται follow-up' : 'did not answer, needs follow-up call',
    not_buying:      isEl ? 'αρνητικός, χρειάζεται επανεκκίνηση' : 'previously declined, needs re-engagement',
    bought:          isEl ? 'ήδη πελάτης, upsell/επέκταση' : 'existing client, upsell opportunity',
    few_reviews:     isEl ? 'επαφή με λίγες αξιολογήσεις, χρειάζεται ανάδειξη αξίας' : 'contact with few reviews, needs value demonstration',
  } as Record<string, string>)[input.status] ?? '';

  const system = isEl
    ? `Είσαι expert σύμβουλος πωλήσεων για εταιρεία κεφαλαιακών επενδύσεων (DN Services Capital).
Δημιούργησε ένα σύντομο, φυσικό, πειστικό script κλήσης ΑΠΟΚΛΕΙΣΤΙΚΑ στα Ελληνικά.
Επιστρέφεις ΜΟΝΟ έγκυρο JSON με αυτή τη δομή (χωρίς markdown):
{ "greeting": string, "pitch": string, "objections": [{"objection": string, "answer": string}], "closing": string }
- greeting: 2-3 προτάσεις εισαγωγής με το όνομα
- pitch: 3-4 προτάσεις κεντρικού μηνύματος, ανάλογα με επάγγελμα/κλάδο
- objections: 3 πιθανές αντιρρήσεις με σύντομη απάντηση για κάθε μία
- closing: 1-2 προτάσεις κλεισίματος με συγκεκριμένο επόμενο βήμα`
    : `You are an expert sales consultant for a capital investment company (DN Services Capital).
Create a short, natural, persuasive call script in ENGLISH ONLY.
Return ONLY valid JSON (no markdown):
{ "greeting": string, "pitch": string, "objections": [{"objection": string, "answer": string}], "closing": string }`;

  const user = isEl
    ? `Φτιάξε script για: ${input.name}${input.jobTitle ? `, ${input.jobTitle}` : ''}${input.industry ? `, κλάδος: ${input.industry}` : ''}.
Κατάσταση: ${statusCtx}.${input.investmentAmount > 0 ? ` Επένδυση: €${input.investmentAmount.toLocaleString()}.` : ''}${input.observations ? `\nΙστορικό: ${input.observations.slice(0, 300)}` : ''}`
    : `Create script for: ${input.name}${input.jobTitle ? `, ${input.jobTitle}` : ''}${input.industry ? `, industry: ${input.industry}` : ''}.
Context: ${statusCtx}.${input.investmentAmount > 0 ? ` Investment: €${input.investmentAmount.toLocaleString()}.` : ''}${input.observations ? `\nHistory: ${input.observations.slice(0, 300)}` : ''}`;

  return callClaude<CallScriptOutput>(system, user);
}
