"use client";
import { usePathname } from "next/navigation";
import { Breadcrumb } from "../components/BreadCrumb";
import { findProject, getProjectIdFromPathName } from "@/lib/gen";
import { PageTypes } from "@/lib/types";

export default function HeaderCrumbSection() {
    const pathName = usePathname();

    const { projectId, pageType, recordSpaceSlug } = getProjectIdFromPathName(pathName);

    if (pageType === PageTypes.recordSpacesList) {
        const { slug: _projectSlug, name } = findProject({ projectId });
        return <Breadcrumb path={[
            { name: "Projects", link: `/` },
            `${name}`,
        ]} />
    }

    if (pageType === PageTypes.recordsList) {
        const { slug: projectSlug } = findProject({ projectId });
        return <Breadcrumb path={[
            { name: "Projects", link: `/` },
            { name: projectSlug, link: `/record-spaces/${projectId}` },
            recordSpaceSlug as any,
        ]} />;
    }

    return <></>
}
