import { CFProblemData } from './types';
import { CFProblemDescription } from './CFProblemDescription';

interface DescriptionTabProps {
    cfData: CFProblemData | null;
}

export default function DescriptionTab({ cfData }: DescriptionTabProps) {
    if (!cfData) return null;
    return <CFProblemDescription data={cfData} />;
}
