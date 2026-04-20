import { prisma } from "../apps/api/src/prisma.ts";

async function main() {
  const settings = await prisma.scheduleSettings.findUnique({
    where: { id: "default" }
  });
  const periods = await prisma.timetablePeriod.findMany({
    orderBy: [{ sortOrder: "asc" }, { startTime: "asc" }]
  });

  console.log(
    JSON.stringify(
      {
        scheduleSettings: settings,
        periods: periods.map((period) => ({
          kind: period.kind,
          label: period.label,
          startTime: period.startTime,
          endTime: period.endTime,
          sortOrder: period.sortOrder
        }))
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
