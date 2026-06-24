type MenuProps = {
    handleClick: () => void
    label: string;
}

export const Menu = ({
    handleClick,
    label
}: MenuProps) => {

    return (
        <button
            className="mx-2 btn-primary small"
            onClick={handleClick}
        >
            {label}
        </button>
    )
}