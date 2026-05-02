
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
        <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit. Rerum dolor praesentium dolores sapiente modi reiciendis? Consectetur tenetur dolorem, quis magni molestiae cum esse, dolores obcaecati eius, error sunt ipsa debitis.</p>
      </AppLayout>
    </>
  );
}
