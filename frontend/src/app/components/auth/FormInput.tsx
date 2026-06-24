
interface FormInputProps {
    title: string;
    type: "email" | "password" | "text" | "number" | "checkbox" | "largeText";
    placeholder?: string;
    name: string;
    value?: string;
    className?: string;
    required?: boolean;
    onChange: (e: any) => void
}

export default function FormInput(props: FormInputProps) {
    return (
        <div className="flex flex-col">
            <label htmlFor="" className="text-[#CACFD8] text-[14px] font-medium">
                {props.title}
            </label>
            <input
                type={props.type}
                value={props.value}
                onChange={props.onChange}
                placeholder={props.placeholder}
                className="h-[44px] border focus:border-2 border-[#525866] focus:border-[#91B8E9] rounded-lg mt-[6px] bg-[#121212] px-[14px] placeholder-[#717784] text-[#FFFFFF] text-base font-normal outline-none"
            />
        </div>
    )
}