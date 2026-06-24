import { capitalizeFirstLetter } from "@/lib/gen";

type StructureFieldButtonProps = {
    name: string;
    onChange: (name: string, value: any) => void;
    value: string | boolean;
}

export const StructureFieldButtonInput = ({ name, onChange, value }: StructureFieldButtonProps) => {

    const setValue = (value: any) => {
        let newValue = value;
        if (name === "name") {
            newValue = value.replace(/[^a-zA-Z0-9_]/g, '');
        }
        onChange(name, newValue);
    }

    return (
        <button
            className={`p-[4px] rounded-md text-[12px] border-2 border-blue ${value === true ? "bg-blue-500 text-white" : "bg-white text-blue-700"}`}
            onClick={() => setValue(value === true ? false : true)}
        >
            {name}
        </button>
    )
}