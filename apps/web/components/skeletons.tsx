import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";

export function IdentitySkeleton() {
  return (
    <Card className="bg-muted/30">
      <CardContent className="py-4 flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-5 w-28 rounded-full" />
      </CardContent>
    </Card>
  );
}

export function TableRowsSkeleton({
  cols = 5,
  rows = 5,
  widths,
}: {
  cols?: number;
  rows?: number;
  widths?: string[];
}) {
  const defaultWidths = ["w-32", "w-48", "w-16", "w-20", "w-16", "w-12"];
  const ws = widths ?? defaultWidths;
  return (
    <div className="rounded-md border">
      <Table>
        <TableBody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRow key={i}>
              {Array.from({ length: cols }).map((_, j) => (
                <TableCell key={j}>
                  <Skeleton className={`h-4 ${ws[j % ws.length]}`} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function ModelsPageSkeleton() {
  return (
    <div className="flex gap-8">
      <FiltersSkeleton />
      <div className="flex-1 min-w-0">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-7 w-48" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-9 w-full" />
            <TableRowsSkeleton
              cols={5}
              rows={8}
              widths={["w-40", "w-20", "w-32", "w-24", "w-14"]}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function FiltersSkeleton() {
  return (
    <aside className="w-52 shrink-0 space-y-6">
      <Skeleton className="h-4 w-16" />
      {Array.from({ length: 3 }).map((_, g) => (
        <div key={g} className="space-y-2">
          <Skeleton className="h-3 w-24" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      ))}
    </aside>
  );
}

export function QuotasPageSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-36" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-9 w-36" />
        </div>
        <TableRowsSkeleton
          cols={6}
          rows={10}
          widths={["w-36", "w-20", "w-28", "w-12", "w-12", "w-20"]}
        />
      </CardContent>
    </Card>
  );
}
