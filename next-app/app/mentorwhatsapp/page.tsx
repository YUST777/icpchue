import { redirect } from 'next/navigation';

// Old link, kept so shared copies still work.
export default function MentorWhatsAppRedirect() {
    redirect('/group');
}
