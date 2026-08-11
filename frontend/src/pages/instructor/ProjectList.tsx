import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, GraduationCap, ChevronsUpDown, Check } from "lucide-react";
import AppLayout from "@/layouts/Applayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useCurrentUser } from "@/hooks/useAuth";
import { useGetInstructorProjects } from "@/hooks/useProject";
import type { ProjectWithSnapshot } from "@/types/project";

type RoleFilter = "all" | "instructor" | "advisor";

const ROLE_OPTIONS: { value: RoleFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "instructor", label: "Instructor" },
  { value: "advisor", label: "Advisor" },
];

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

function RoleFilterDropdown({
  value,
  onChange,
}: {
  value: RoleFilter;
  onChange: (value: RoleFilter) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = ROLE_OPTIONS.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="flex items-center gap-2 rounded-xl border-neutral-200 bg-white px-3.5 py-2 text-sm font-medium text-[#231A2E] hover:bg-neutral-50"
        >
          <span className="text-neutral-500">Role:</span>
          <Badge className="rounded-full bg-[#F3EFE6] text-[#7A0C2E] hover:bg-[#F3EFE6]">
            {selected?.label}
          </Badge>
          <ChevronsUpDown size={14} className="text-neutral-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-0" align="start">
        <Command>
          <CommandList>
            <CommandGroup>
              {ROLE_OPTIONS.map((option) => (
                <CommandItem
                  key={option.value}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between"
                >
                  {option.label}
                  {value === option.value && (
                    <Check size={14} className="text-[#7A0C2E]" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function ProjectsPage() {
  const { data: user, isLoading: isUserLoading } = useCurrentUser();
  const {
    data: projects,
    isLoading: isProjectsLoading,
    isError,
  } = useGetInstructorProjects(user?.id ?? "");

  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

  const isLoading = isUserLoading || isProjectsLoading;

  const instructorProjects =
    projects?.filter((p) => p.instructor === user?.id) ?? [];
  const advisorProjects = projects?.filter((p) => p.advisor === user?.id) ?? [];

  const filteredProjects = useMemo(() => {
    if (roleFilter === "instructor") {
      return instructorProjects.map((project) => ({
        project,
        role: "instructor" as const,
      }));
    }
    if (roleFilter === "advisor") {
      return advisorProjects.map((project) => ({
        project,
        role: "advisor" as const,
      }));
    }
    return [
      ...instructorProjects.map((project) => ({
        project,
        role: "instructor" as const,
      })),
      ...advisorProjects.map((project) => ({
        project,
        role: "advisor" as const,
      })),
    ];
  }, [roleFilter, instructorProjects, advisorProjects]);

  const emptyMessage =
    roleFilter === "instructor"
      ? "You are not assigned as an instructor on any project yet."
      : roleFilter === "advisor"
      ? "You are not assigned as an advisor on any project yet."
      : "You are not assigned to any project yet.";

  return (
    <AppLayout breadcrumbs={[{ label: "Projects", href: "/project-list" }]}>
      <div className="min-h-screen w-full px-4">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#231A2E]">Projects</h1>
            <p className="mt-2 text-sm text-neutral-500">
              Projects connected to your instructor and advisor profile.
            </p>
          </div>
          <RoleFilterDropdown value={roleFilter} onChange={setRoleFilter} />
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
          <Card className="border border-neutral-200 shadow-sm">
            <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-[#FBF3E7] p-2 text-[#C9A84C]">
                  <GraduationCap size={16} />
                </div>
                <h2 className="text-lg font-semibold text-[#231A2E]">
                  Projects
                </h2>
              </div>
              <span className="rounded-full bg-neutral-100 px-3 py-1 text-sm font-medium text-neutral-600">
                {filteredProjects.length}
              </span>
            </div>

            <div className="space-y-3 p-5">
              {filteredProjects.length > 0 ? (
                filteredProjects.map(({ project, role }) => (
                  <ProjectCard key={`${role}-${project.id}`} project={project} role={role} />
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 p-6 text-center text-sm text-neutral-500">
                  {emptyMessage}
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}