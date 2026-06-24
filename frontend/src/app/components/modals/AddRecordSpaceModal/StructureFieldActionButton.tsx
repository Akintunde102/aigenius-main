import { useState } from "react"

type StructureFieldActionButtonProps = {
    onClickHandler: () => void
    title: string
    highlight?: boolean
}


const Button = ({ onClickHandler, title }: Omit<StructureFieldActionButtonProps, "highlight">) => {

    return (
        <div
            onClick={() => onClickHandler()}
            className="my-2  cursor-pointer text-center text-[14px] p-[2px] px-[4px] border border-gray-300 outline-none hover:bg-gray-50 bg-gray-200"
        >  {title}
        </div>
    )
}

export const StructureFieldActionButton = ({ onClickHandler, title, highlight = false }: StructureFieldActionButtonProps) => {
    const [animate, setAnimate] = useState(false);
    const handleClick = () => {
        setAnimate(true);
        setTimeout(() => setAnimate(false), 200);
        onClickHandler();
    };

    return (
        <div className="relative">
            {highlight && (
                <div
                    className="absolute inset-0 bg-blue-500 bg-opacity-20 rounded-md"
                    style={{
                        animation: animate ? "pulse 0.2s ease-in-out" : undefined,
                    }}
                />
            )}
            <Button onClickHandler={handleClick} title={title} />
        </div>
    );
}

