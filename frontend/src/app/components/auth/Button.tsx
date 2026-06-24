import React from "react";
import { useRouter } from "next/navigation";

type Props = {
    text: string;
    route: string;
};

const Button = ({ text, route }: Props) => {
    const router = useRouter();

    return (
        <button
            onClick={() => router.push(route)}
            className="bg-transparent text-white hover:text-gray-200 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:bg-white/10 border border-transparent hover:border-white/20"
        >
            {text}
        </button>
    );
};

export default Button;
