import { CircleCheck, Pencil, Trash2 } from "lucide-react";

import { SelectNative } from "@/components/dashboard/select-native";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { dashboardContent } from "@/lib/config";
import { formatDate, formatMoney } from "@/lib/format";
import { getNextChargeDate } from "@/lib/tracker/dates";
import { SERVICE_STATUSES, type Service, type ServiceStatus } from "@/lib/tracker/types";

type TableServicesProps = {
  services: Service[];
  today: string;
  monthStart: string;
  busyIds: ReadonlySet<number>;
  onTogglePaid: (service: Service) => void;
  onChangeStatus: (service: Service, status: ServiceStatus) => void;
  onEdit: (service: Service) => void;
  onDelete: (service: Service) => void;
};

export function TableServices({
  services,
  today,
  monthStart,
  busyIds,
  onTogglePaid,
  onChangeStatus,
  onEdit,
  onDelete,
}: TableServicesProps) {
  const columns = dashboardContent.columns;

  return (
    <div className="rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{columns.service}</TableHead>
            <TableHead>{columns.category}</TableHead>
            <TableHead>{columns.cost}</TableHead>
            <TableHead>{columns.nextCharge}</TableHead>
            <TableHead>{columns.status}</TableHead>
            <TableHead>{columns.paid}</TableHead>
            <TableHead className="text-right">
              <span className="sr-only">{columns.actions}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {services.map((service) => {
            const busy = busyIds.has(service.id);
            const isActive = service.status === "active";
            const isPaid = service.lastPaidMonth === monthStart;

            return (
              <TableRow key={service.id} className={isActive ? undefined : "text-muted-foreground"}>
                <TableCell className="font-medium">{service.title}</TableCell>
                <TableCell>{service.category}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {formatMoney(service.amount, service.currency)}{" "}
                  <span className="text-xs text-muted-foreground">
                    {service.billingCycle === "yearly"
                      ? dashboardContent.perYear
                      : dashboardContent.perMonth}
                  </span>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {isActive
                    ? formatDate(getNextChargeDate(service.nextBillingDate, service.billingCycle, today))
                    : "—"}
                </TableCell>
                <TableCell>
                  <SelectNative
                    className="w-32"
                    aria-label={columns.status}
                    value={service.status}
                    disabled={busy}
                    onChange={(event) =>
                      onChangeStatus(service, event.target.value as ServiceStatus)
                    }
                  >
                    {SERVICE_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {dashboardContent.statusLabels[status]}
                      </option>
                    ))}
                  </SelectNative>
                </TableCell>
                <TableCell>
                  {isActive ? (
                    <Button
                      size="sm"
                      variant={isPaid ? "secondary" : "outline"}
                      disabled={busy}
                      onClick={() => onTogglePaid(service)}
                    >
                      <CircleCheck />
                      {isPaid ? dashboardContent.paidLabel : dashboardContent.markPaidLabel}
                    </Button>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={dashboardContent.editLabel}
                      disabled={busy}
                      onClick={() => onEdit(service)}
                    >
                      <Pencil />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={dashboardContent.deleteLabel}
                      disabled={busy}
                      onClick={() => onDelete(service)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
