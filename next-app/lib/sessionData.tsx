import React from 'react';
import Session1Content from './content/sessions/Session1Content';
import Session3Content from './content/sessions/Session3Content';
import Session4Content from './content/sessions/Session4Content';
import Session5Content from './content/sessions/Session5Content';
import Session6Content from './content/sessions/Session6Content';
import Session7Content from './content/sessions/Session7Content';
import { FullRevisionContent, ExamTrainingContent } from './content/sessions/Programming1Content';

// --- Data Definitions ---

export interface Session {
    id: number;
    campSlug: string;
    number: string;
    displayNumber: string;
    slug: string;
    title: string;
    desc: string;
    description: string;
    tag: string;
    thumbnail?: string;
    videoId?: string;
    content?: React.ReactNode;
}

export interface Camp {
    slug: string;
    title: string;
    description: string;
    image: string;
    sessions: Session[];
    publicVisible?: boolean;
    dashboardVisible?: boolean;
}

export const camps: Camp[] = [
    {
        slug: "level0",
        title: "Level 0",
        description: "Fundamental C++ concepts including Data Types, I/O, Control Flow, and Loops.",
        image: '/images/lessons/levels_camp/level0/cover.webp',
        publicVisible: false,
        dashboardVisible: true,
        sessions: [
            {
                id: 1,
                campSlug: 'level0',
                number: '1',
                displayNumber: '01',
                slug: 'data-types',
                tag: 'Fundamentals',
                title: 'Data Types & I/O',
                desc: 'Fundamentals of C++ Input/Output streams, arithmetic operators, and understanding basic data types and their limits.',
                description: 'Master the basics of C++, input/output streams, and understand how data is stored in memory. Essential first steps for any competitive programmer.',
                thumbnail: '/images/lessons/levels_camp/level0/datatypes.webp',
                videoId: '1Ihh7e6pxPbu5L8RobscDgfSVv-WJEE6g',
                content: <Session1Content />
            },
            {
                id: 4,
                campSlug: 'level0',
                number: '2',
                displayNumber: '02',
                slug: 'revision',
                tag: 'Revision',
                title: 'Revision ( I/O & Data Types / Control Flow / Loops )',
                desc: 'Comprehensive review covering all previous topics with 3 practice problems to solidify your understanding.',
                description: 'Comprehensive review of all previous topics with 3 practice problems to solidify your understanding.',
                thumbnail: '/images/lessons/levels_camp/level0/revision.webp',
                videoId: '1sQT2Uk9A0FdDqn1gzBgvl8zn2rge3fe0',
                content: <Session4Content />
            },
            {
                id: 3,
                campSlug: 'level0',
                number: '3',
                displayNumber: '03',
                slug: 'control-flow',
                tag: 'Control Flow',
                title: 'Control Flow',
                desc: 'Mastering decision making with if-else statements, switch cases, and understanding program flow control.',
                description: 'Master conditional statements, logical operators, and control flow patterns. Learn when to use if/else vs switch, and optimize your decision-making code.',
                thumbnail: '/images/lessons/levels_camp/level0/control-flow.webp',
                videoId: '1rm9v66HZd-_bZ7Z9KrpPbIIubBaqIa14',
                content: <Session3Content />
            },
            {
                id: 8,
                campSlug: 'level0',
                number: '4',
                displayNumber: '04',
                slug: 'functions',
                tag: 'Fundamentals',
                title: 'Functions',
                desc: 'Mastering functions in C++, understanding scope, parameters, and modular programming.',
                description: 'Learn how to write modular code using functions. covering scope, pass-by-value vs pass-by-reference, and organizational best practices.',
                thumbnail: '/images/lessons/levels_camp/level0/functions.webp',
                videoId: '12sTF5jj5S-w763CNt_k5XNpuAjYJC9Fk',
            },
            {
                id: 9,
                campSlug: 'level0',
                number: '5',
                displayNumber: '05',
                slug: 'recursion',
                tag: 'Fundamentals',
                title: 'Recursion',
                desc: 'Understanding recursion in C++, base cases, and recursive programming techniques.',
                description: 'Dive into recursion. Learn how functions can call themselves, understand base cases, and solve complex problems using recursive techniques.',
                thumbnail: '/images/lessons/approval/recursion.webp',
                videoId: '1bWcPjD6DEsCRKQ14Gk_M-1EHjvrKkD4C',
            },
            {
                id: 10,
                campSlug: 'level0',
                number: '6',
                displayNumber: '06',
                slug: 'arrays-and-adhocs',
                tag: 'Data Structures',
                title: 'Arrays and Ad-Hocs',
                desc: 'Introduction to 1D/2D arrays and strategies for solving ad-hoc problems.',
                description: 'Learn how to store multiple values using arrays in C++ and develop logical thinking to tackle ad-hoc problems effectively.',
                thumbnail: '/images/lessons/levels_camp/level0/arrays-adhocs.png',
                videoId: '1lSj_AO1AijyMLAwayNFWbVTX81lfWHyY',
                content: <Session6Content />
            },
            {
                id: 11,
                campSlug: 'level0',
                number: '7',
                displayNumber: '07',
                slug: 'complexity',
                tag: 'Analysis',
                title: 'Complexity',
                desc: 'Introduction to time complexity analysis, Big-O notation, and estimating runtime from problem constraints.',
                description: 'Learn how to analyze the efficiency of your code using Big-O notation. Understand common complexities and how to pick the right approach based on input constraints.',
                thumbnail: '/images/lessons/levels_camp/level0/complexity.png',
                videoId: '1nNM7Zd4DoZZB5js5Se3tzU9q0UPzneHb',
                content: <Session7Content />
            },
            {
                id: 12,
                campSlug: 'level0',
                number: '8',
                displayNumber: '08',
                slug: 'contest-3',
                tag: 'Contest',
                title: 'Contest #3',
                desc: 'Live contest session — solve problems under time pressure and review solutions.',
                description: 'Recording of Contest #3. Practice solving competitive programming problems under real contest conditions with post-contest solution review.',
                thumbnail: '/images/lessons/levels_camp/level0/contest3.png',
                videoId: '1NpXBt2jPxwE6696h9UKnsdV5qtZKy5R4',
            },
        ]
    },
    {
        slug: "programming1",
        title: "Programming 1 Camp",
        description: "Master the basics of Programming 1.",
        image: '/images/lessons/pro1/pro1camp.webp',
        publicVisible: true,
        dashboardVisible: true,
        sessions: [
            {
                id: 6,
                campSlug: 'programming1',
                number: '1',
                displayNumber: '01',
                slug: 'revision',
                tag: 'Programming 1',
                title: 'Full Revision',
                desc: 'Comprehensive revision of Programming 1 concepts.',
                description: 'Comprehensive revision of Programming 1 concepts.',
                thumbnail: '/images/lessons/pro1/revison.webp',
                videoId: '1wa6DS3f-PMTaGEmdnvuU7q-ILkE703ak',
                content: <FullRevisionContent />
            },
            {
                id: 7,
                campSlug: 'programming1',
                number: '2',
                displayNumber: '02',
                slug: 'exam-training',
                tag: 'Programming 1',
                title: 'Exam Training',
                desc: 'Live exam training session recording.',
                description: 'Recording of the live exam training session covering problem solving strategies.',
                thumbnail: '/images/lessons/pro1/examtraining.webp',
                videoId: '1n3aiK4zG29WK6Si3NoJnnZKN-QvymCjR',
                content: <ExamTrainingContent />
            }
        ]
    },
    {
        slug: "level1",
        title: "Level 1",
        description: "Advanced topics for competitive programming.",
        image: '/images/lessons/levels_camp/level1/cover.webp',
        publicVisible: false,
        dashboardVisible: true,
        sessions: [
            {
                id: 5,
                campSlug: 'level1',
                number: '1',
                displayNumber: '01',
                slug: 'time-complexity',
                tag: 'Intermediate',
                title: 'Time Complexity',
                desc: 'Introduction to Algorithms, Instructions, and Time Complexity analysis (O(n), O(1), O(n²)).',
                description: 'Introduction to Algorithms, Instructions, and Time Complexity. Learn O(n), O(1), and O(n²) analysis with practical examples.',
                thumbnail: '/images/lessons/levels_camp/level1/complexity.webp',
                videoId: '1fH4AIGqw3j6XSomagPB3CNwJVtM1YUxf',
                content: <Session5Content />
            },
        ]
    },
];
