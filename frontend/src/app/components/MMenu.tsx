type MenuProps = {
    handleClick: () => void
    label: string;
}

export const MMenu = ({
    handleClick,
    label
}: MenuProps) => {

    return (
        <button
            className="text-[#24242E] text-[14px] tracking-[-0.01em] cursor-pointer mb-8 md:text-[8px] mx-2 btn-primary-two lg:text-[16px]  xl:text-[16px] sm:text-sm small"
            onClick={handleClick}
        >
            {label}
        </button>
    )
}