interface TraineeIconProps {
    className?: string;
    color?: string;
}

export default function TraineeIcon({ className = "w-8 h-8", color = "#60a5fa" }: TraineeIconProps) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <circle cx="12" cy="6" r="4" fill={color}></circle>
            <path d="M20 17.5C20 19.9853 20 22 12 22C4 22 4 19.9853 4 17.5C4 15.0147 7.58172 13 12 13C16.4183 13 20 15.0147 20 17.5Z" fill={color}></path>
        </svg>
    );
}
