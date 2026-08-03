import { useNavigate } from "react-router-dom";
import { Eye, GraduationCap } from "lucide-react";
import AppLayout from "@/layouts/Applayout";
import { Card } from "@/components/ui/card";
import { useCurrentUser } from "@/hooks/useAuth";
import { useGetInstructorProjectsWithSnapshot } from "@/hooks/useProject";
import type { ProjectWithSnapshot } from "@/types/project";

function ProjectCard({
  project,
  role,
}: {
  project: ProjectWithSnapshot;
  role: "instructor" | "advisor";
}) {
  const navigate = useNavigate();
  const slug = project.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const projectRouteId = project.id ?? slug;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#F3EFE6] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7A0C2E]">
            {role}
          </span>
          <span className="text-xs text-neutral-400">{project.created_by}</span>
        </div>
        <h3 className="mt-2 text-base font-semibold text-[#231A2E]">
          {project.name}
        </h3>
        <p className="mt-1 text-sm text-neutral-500">{project.description}</p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate(`/view-project/${projectRouteId}`)}
          className="flex items-center gap-2 rounded-xl bg-[#7A0C2E] px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#630A25]"
        >
          <Eye size={16} />
          View
        </button>
      </div>
    </div>
  );
}

function ProjectSection({
  title,
  role,
  projects,
  emptyMessage,
}: {
  title: string;
  role: "instructor" | "advisor";
  projects: ProjectWithSnapshot[];
  emptyMessage: string;
}) {
  return (
    <Card className="border border-neutral-200 shadow-sm">
      <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-[#FBF3E7] p-2 text-[#C9A84C]">
            <GraduationCap size={16} />
          </div>
          <h2 className="text-lg font-semibold text-[#231A2E]">{title}</h2>
        </div>
        <span className="rounded-full bg-neutral-100 px-3 py-1 text-sm font-medium text-neutral-600">
          {projects.length}
        </span>
      </div>

      <div className="space-y-3 p-5">
        {projects.length > 0 ? (
          projects.map((project) => (
            <ProjectCard key={project.id} project={project} role={role} />
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-6 text-center text-sm text-neutral-500">
            {emptyMessage}
          </div>
        )}
      </div>
    </Card>
  );
}

export default function ProjectsPage() {
  const { data: user, isLoading: isUserLoading } = useCurrentUser();
  const {
    data: projects,
    isLoading: isProjectsLoading,
    isError,
  } = useGetInstructorProjectsWithSnapshot(user?.id ?? "");

  const isLoading = isUserLoading || isProjectsLoading;

  const instructorProjects =
    projects?.filter((p) => p.instructor === user?.id) ?? [];
  const advisorProjects = projects?.filter((p) => p.advisor === user?.id) ?? [];

  return (
    <AppLayout breadcrumbs={[{ label: "Projects", href: "/project-list" }]}>
      <div className="min-h-screen w-full px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#231A2E]">Projects</h1>
          <p className="mt-2 text-sm text-neutral-500">
            Projects connected to your instructor and advisor profile.
          </p>
        </div>

        {isLoading ? (
          <Card className="border border-neutral-200 p-6 text-sm text-neutral-500 shadow-sm">
            Loading your projects...
          </Card>
        ) : isError ? (
          <Card className="border border-neutral-200 p-6 text-sm text-red-600 shadow-sm">
            We could not load your projects right now.
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <ProjectSection
              title="Instructor Projects"
              role="instructor"
              projects={instructorProjects}
              emptyMessage="You are not assigned as an instructor on any project yet."
            />
            <ProjectSection
              title="Advisor Projects"
              role="advisor"
              projects={advisorProjects}
              emptyMessage="You are not assigned as an advisor on any project yet."
            />
          </div>
        )}
      </div>
    </AppLayout>
  );
}
