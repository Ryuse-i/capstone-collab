import ProjectResourcesPanel from "@/components/user/ProjectResourcesPanel";
import { useCurrentUser } from "@/hooks/useAuth";
import { useGetCurrentProject } from "@/hooks/useProject";

export default function StudentResources() {
  const userQuery = useCurrentUser();
  const projectQuery = useGetCurrentProject(userQuery.data?.id ?? "");
  const project = projectQuery.data;

  return (
    <ProjectResourcesPanel
      projectId={project?.id}
      projectName={project?.name}
      projectLoading={userQuery.isLoading || projectQuery.isLoading}
      projectError={userQuery.isError || projectQuery.isError}
      noProjectMessage="Join a capstone project to access its shared resources."
    />
  );
}