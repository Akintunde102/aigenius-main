"use client";
import { Input } from "@/app/components/form/input";
import { capitalizeFirstLetter } from "@/lib/gen";
import { BooleanField } from "@/app/components/form/BooleanInputField";
import { CSSProperties } from "react";
import dynamic from "next/dynamic";

// Code split heavy components
const CodeMirrorComponent = dynamic(() =>
  Promise.all([
    import('@uiw/react-codemirror'),
    import('@codemirror/lang-javascript')
  ]).then(([codeMirror, jsLang]) => {
    const CodeMirror = codeMirror.default;
    const javascript = jsLang.javascript;

    return {
      default: ({ value, onChange, ...props }: any) => (
        <CodeMirror
          {...props}
          value={value}
          extensions={[javascript({ jsx: true })]}
          onChange={onChange}
        />
      )
    };
  }),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-24 bg-gray-100 rounded border animate-pulse flex items-center justify-center">
        <span className="text-gray-400">Loading code editor...</span>
      </div>
    )
  }
);

const Editor = dynamic(() => import("@/app/components/editor/Editor"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-32 bg-gray-100 rounded border animate-pulse flex items-center justify-center">
      <span className="text-gray-400">Loading editor...</span>
    </div>
  )
});

type InputDetails = {
  label: string;
  name: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  description?: string;
  value: string | boolean;
  onChange: (name: string, value: any) => void;
  formValues?: any;
  style?: CSSProperties;
};

export const InputField = (inputDetails: InputDetails) => {
  const { name, placeholder, label, type, value, onChange, style } = inputDetails;

  return (
    <>
      <div className="block mb-2 font-[400] text-[16px]">
        <span>{capitalizeFirstLetter(label)}{inputDetails.required && <>*</>}</span>
        {
          ["object", "array"].includes(type) && (
            <sup className="text-gray-500 text-[9px] sups">&nbsp;{type}</sup>
          )
        }

      </div>
      {type === "editor" && <Editor id={name} onChange={(e: any) => {
        const { name, value } = e.target;
        onChange(name, value)
      }} value={value} />}
      {["text", "email", "number"].includes(type) && (
        <Input
          type={type}
          className="w-full border border-[#DFE5EC] focus:ring-0 rounded-sm h-[48px] pl-[16px] placeholder:text-[16px] mt-[8px] inputBorder"
          name={name}
          placeholder={placeholder ?? ""}
          value={value ? String(value) : ""}
          onChange={(e) => {
            const { name, value } = e.target;
            onChange(name, value)
          }}
          style={style ?? {}}
        />
      )}
      {["checkbox"].includes(type) && (
        <BooleanField
          value={value as boolean}
          onChange={(value: boolean) => {
            onChange(name, value)
          }} />
      )}
      {["object", "array"].includes(type) && (
        <div className="border border-[#DFE5EC] focus:ring-0 rounded-sm  pl-[16px] mt-[8px] inputBorder">
          <CodeMirrorComponent
            height="100px"
            value={value as string}
            onChange={(value: string) => {
              onChange(name, value);
            }}
          />
        </div>
      )}
    </>
  );
};
