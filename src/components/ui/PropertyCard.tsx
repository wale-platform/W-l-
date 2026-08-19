import Link from "next/link";

import {
  Badge,
  Button,
  Card,
  CardBody,
} from "@/components/ui";

interface PropertyCardProps {
  title: string;
  price: number;
  location: string;
  status: "pending" | "approved" | "rejected";
  onDelete: () => void;
}

export function PropertyCard({
  title,
  price,
  location,
  status,
  onDelete,
}: PropertyCardProps) {
  return (
    <Card>
      <CardBody className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-ink-900">
              {title}
            </h3>

            <p className="mt-1 text-sm text-ink-500">
              {location}
            </p>
          </div>

          <div className="flex flex-col items-end gap-1">
                    <Badge
                      tone={
                        status === "approved"
                          ? "success"
                          : status === "rejected"
                            ? "danger"
                            : "warning"
                      }
                    >
            {status}
                </Badge>

                {status === "pending" && (
                  <p className="text-xs text-warning">
                     Waiting for verification
                    </p>
                    )}

                    {status === "approved" && (
                      <p className="text-xs text-success">
                        Property is live
                      </p>
                    )}

                    {status === "rejected" && (
                      <p className="text-xs text-danger">
                        Property needs attention
                      </p>
                    )}
</div>
        </div>

        <p className="text-lg font-semibold text-ink-900">
          ₦{price.toLocaleString()}
        </p>

        <div className="flex gap-3">
          <Link href="/landlord/properties/edit">
            <Button tone="outline" size="sm">
              Edit
            </Button>
          </Link>

          <Button
              tone="danger"
              size="sm"
              onClick={onDelete}>
              Delete
            </Button>
        </div>
      </CardBody>
    </Card>
  );
}