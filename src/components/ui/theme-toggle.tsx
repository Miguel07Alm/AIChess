"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
    const { setTheme, theme } = useTheme();
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
        const initialTheme = window.localStorage.getItem("theme") || "light";
        setTheme(initialTheme);
    }, []);

    if (!mounted) {
        return null; // o un elemento vacío que no afecte el renderizado
    }

    return (
        <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="relative inline-flex items-center justify-center rounded-full p-2
            bg-zinc-100
            hover:bg-zinc-200
            transition-all duration-200 ease-in-out
            shadow-sm hover:shadow-md
            border border-zinc-200"
        >
            {theme === "light" ? (
                <Sun
                    className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all 
                text-amber-600 hover:text-amber-700"
                />
            ) : (
                <Moon
                    className="h-[1.2rem] w-[1.2rem] scale-100 transition-all 
                text-blue-500 hover:text-blue-600"
                />
            )}
            <span className="sr-only">Toggle theme</span>
        </button>
    );
}
