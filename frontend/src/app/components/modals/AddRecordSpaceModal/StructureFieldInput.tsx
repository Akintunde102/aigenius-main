import { capitalizeFirstLetter } from "@/lib/gen";
import { StructureTypeFieldInput } from "./StructureTypeFieldInput";

type StructureFieldInputProps = {
    name: string;
    onChange: (name: string, value: any) => void;
    value: string | boolean;
    showOptionalInputFields?: boolean;
}

export const StructureFieldInput = ({ name, onChange, value, showOptionalInputFields }: StructureFieldInputProps) => {

    const setValue = (value: any) => {
        let newValue = value;
        if (name === "name") {
            newValue = value.replace(/[^a-zA-Z0-9_]/g, '');
        }
        onChange(name, newValue);
    }


    const optionalInputFieldNames = ["description", "comment"];

    if (!showOptionalInputFields && optionalInputFieldNames.includes(name)) {

        return <></>
    }

    return (

        <div className="flex my-1 py-1 items-center justify-center">
            <span className="text-[14px] mr-2">
                {capitalizeFirstLetter(name)}:
            </span>
            {
                name === "type"
                    ? (
                        <StructureTypeFieldInput name={name} value={value} setValue={setValue} />)
                    : (

                        <input
                            className="x-input"
                            onChange={e => setValue(e.target.value)}
                            type="text"
                            value={value as string}
                        />
                    )
            }
        </div >
    )
}