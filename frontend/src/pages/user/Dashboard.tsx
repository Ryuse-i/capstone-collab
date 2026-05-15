import AppLayout from "@/layouts/Applayout";

export default function Dashboard() {
  return (
    <>
      <AppLayout
        breadcrumbs={[
          {
            label: "Dashboard",
            href: "/dashboard",
          },
        ]}
      >
        <p>I have nothing</p>
      </AppLayout>
    </>
  );
}
