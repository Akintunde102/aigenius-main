type SubmitButtonProps = {
    onClickHandler: () => void;
    title: string;
}

export const SubmitButton = ({ onClickHandler, title }: SubmitButtonProps) => {
    return (
        <button
            onClick={() => onClickHandler()}
            className="mb-4 text-white text-[14px] font-[500] bg-blue-500 active:bg-blue-300 hover:bg-blue-700 py-2 px-4 rounded transition duration-300 ease-in-out w-full"
        >
            {title}
        </button>
    )
}