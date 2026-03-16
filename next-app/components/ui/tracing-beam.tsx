"use client";
import React, { useEffect, useRef, useState } from "react";
import { motion, useTransform, useScroll, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

export const TracingBeam = ({
    children,
    className,
}: {
    children: React.ReactNode;
    className?: string;
}) => {
    const ref = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start start", "end end"],
    });

    const contentRef = useRef<HTMLDivElement>(null);
    const [svgHeight, setSvgHeight] = useState(0);

    useEffect(() => {
        if (contentRef.current) {
            setSvgHeight(contentRef.current.offsetHeight);
        }
    }, []);

    const y1 = useSpring(useTransform(scrollYProgress, [0, 0.8], [50, svgHeight]), {
        stiffness: 500,
        damping: 90,
    });
    const y2 = useSpring(useTransform(scrollYProgress, [0, 1], [50, svgHeight - 200]), {
        stiffness: 500,
        damping: 90,
    });

    return (
        <motion.div
            ref={ref}
            className={cn("relative w-full max-w-7xl ml-4 md:ml-12 h-full", className)}
        >

            <div ref={contentRef}>{children}</div>
        </motion.div>
    );
};
