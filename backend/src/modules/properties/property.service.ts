import { Prisma, PropertyStatus } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import {
  toSerializedProperty,
  type SerializedProperty,
} from "./property.serializer";
import type { ListPropertiesQuery } from "./property.schemas";

/**
 * Read-only property queries backing the frontend catalogue.
 *
 * Only publicly listable statuses are ever returned: VERIFIED and
 * PENDING_VERIFICATION. DRAFT/REJECTED/SUSPENDED listings are invisible to the
 * public API. `verifiedOnly=true` narrows further to VERIFIED alone.
 */

const PUBLICLY_LISTABLE: PropertyStatus[] = [
  PropertyStatus.VERIFIED,
  PropertyStatus.PENDING_VERIFICATION,
];

export type PropertyListResult = {
  properties: SerializedProperty[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function buildWhere(q: ListPropertiesQuery): Prisma.PropertyWhereInput {
  const where: Prisma.PropertyWhereInput = {
    status: q.verifiedOnly ? PropertyStatus.VERIFIED : { in: PUBLICLY_LISTABLE },
  };

  if (q.university) where.university = q.university;
  if (q.type) where.type = q.type;

  if (q.minPrice !== undefined || q.maxPrice !== undefined) {
    where.price = {
      ...(q.minPrice !== undefined ? { gte: q.minPrice } : {}),
      ...(q.maxPrice !== undefined ? { lte: q.maxPrice } : {}),
    };
  }

  if (q.query) {
    const contains = { contains: q.query, mode: "insensitive" as const };
    where.OR = [
      { title: contains },
      { description: contains },
      { address: contains },
      { city: contains },
      { state: contains },
    ];
  }

  return where;
}

export async function listProperties(q: ListPropertiesQuery): Promise<PropertyListResult> {
  const where = buildWhere(q);
  const skip = (q.page - 1) * q.pageSize;

  const [rows, total] = await Promise.all([
    prisma.property.findMany({
      where,
      include: { images: true },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip,
      take: q.pageSize,
    }),
    prisma.property.count({ where }),
  ]);

  return {
    properties: rows.map(toSerializedProperty),
    total,
    page: q.page,
    pageSize: q.pageSize,
    totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
  };
}

export async function getPropertyById(id: string): Promise<SerializedProperty | null> {
  const property = await prisma.property.findFirst({
    where: { id, status: { in: PUBLICLY_LISTABLE } },
    include: { images: true },
  });
  return property ? toSerializedProperty(property) : null;
}
