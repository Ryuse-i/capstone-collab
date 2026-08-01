import AppLayout from "@/layouts/Applayout";

export default function ProjectTasks() {
  return (
    <>
      <AppLayout
        breadcrumbs={[
          {
            label: "Project Tasks",
            href: "/project-tasks",
          },
        ]}
      >
        <div>Dylan panget</div>
      </AppLayout>
    </>
  );
}
