'use client';

import { useEffect } from 'react';
import { motion, useSpring, useTransform, MotionValue } from 'framer-motion';

interface NumberCompProps {
    mv: MotionValue<number>;
    number: number;
    height: number;
}

function NumberComp({ mv, number, height }: NumberCompProps) {
    const y = useTransform(mv, (latest) => {
        const placeValue = latest % 10;
        const offset = (10 + number - placeValue) % 10;
        let memo = offset * height;
        if (offset > 5) memo -= 10 * height;
        return memo;
    });
    return <motion.span style={{ y, display: 'block' }}>{number}</motion.span>;
}

interface DigitProps {
    place: number;
    value: number;
    height: number;
}

function Digit({ place, value, height }: DigitProps) {
    const valueRoundedToPlace = Math.floor(value / place);
    const animatedValue = useSpring(valueRoundedToPlace);

    useEffect(() => {
        animatedValue.set(valueRoundedToPlace);
    }, [animatedValue, valueRoundedToPlace]);

    return (
        <div style={{ height, overflow: 'hidden', display: 'inline-flex', flexDirection: 'column' }}>
            {Array.from({ length: 10 }, (_, i) => (
                <NumberComp key={i} mv={animatedValue} number={i} height={height} />
            ))}
        </div>
    );
}

interface CounterProps {
    value: number;
    places?: number[];
    fontSize?: number;
    textColor?: string;
}

export default function Counter({
    value,
    places = [100, 10, 1],
    fontSize = 24,
    textColor = 'white'
}: CounterProps) {
    return (
        <div
            className="counter-container"
            style={{
                display: 'flex',
                gap: 2,
                fontSize,
                color: textColor,
                fontWeight: 'bold',
                lineHeight: 1
            }}
        >
            {places.map((place) => (
                <Digit key={place} place={place} value={value} height={fontSize} />
            ))}
        </div>
    );
}
