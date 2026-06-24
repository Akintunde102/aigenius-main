"use client";
import Link from "next/link";
import { FaGithub, FaGoogle } from "react-icons/fa";
import { buttonVariants } from "@/app/components/ui/button";
import { cn } from "@/lib/utils";

const OAuthBtn = ({ link, title, name }: {
  link: string;
  title: string;
  name: "google" | "github";
}) => {

  return (
    <Link
      href={link}
      prefetch={false}
      className={cn(
        buttonVariants({ size: "lg" }),
        "w-full mt-1 h-12 bg-gradient-primary text-white border-0 justify-between px-5"
      )}
    >
      {name === "google" ? (
        <FaGoogle className="text-lg" />
      ) : (
        <FaGithub className="text-lg" />
      )}
      <span className="text-[16px] font-semibold">{title}</span>
      <span className="w-5" />
    </Link>
  );
};

export default OAuthBtn;
