import { authHttp } from "@/lib/api/auth-client";
import { LINKS } from "@/lib/links";
import { useQuery } from "@tanstack/react-query"

export const useGetBulkData = (projectId: string, recordSpaceSlug: string) => {
    const url = `${LINKS.noboxAPIRootUrl}/gateway/*/bulk-project-resources?tag=newHook`;

    const { data, isLoading } = useQuery({
        queryFn: async () => authHttp.get(url).then(async (res) => res.data),
        queryKey: ['views'],
        staleTime: 12000000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
    });


    return {
        data: data,
        isLoading,
    };
}

export const getProjectData = (data: any[], projectId: string, recordSpaceSlug: string) => {
    const project = data?.filter((x: any) => x.id === projectId)[0] ?? null;
    const recordSpace = project?.recordSpaces.filter((x: any) => x.slug === recordSpaceSlug)[0] ?? null;

    return {
        project,
        recordSpace,
    }
}



