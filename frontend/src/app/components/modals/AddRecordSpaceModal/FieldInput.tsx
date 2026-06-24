import { capitalizeFirstLetter } from "@/lib/gen";

type FieldInputProps = {
    name: string;
    value?: string;
    setValue: (value: string) => void;
    placeholder?: string;
}

export const FieldInput = ({ name, setValue, value, placeholder }: FieldInputProps) => {

    return (
        <div className="flex my-1 py-1 items-center justify-center">
            <span className="text-[14px] mr-2">
                {capitalizeFirstLetter(name)}:
            </span>
            <input
                onChange={e => setValue(e.currentTarget.value)}
                className="x-input"
                type="text"
                placeholder={placeholder ?? ""}
                value={value}
            />
        </div>
    )
}

