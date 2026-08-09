/**
 * The days the school is closed.
 *
 * The reads are GraphQL; create, update and delete are still REST. The Expo
 * client also reads these endpoints over REST, so the routes stay — see debt
 * 31 in the server's register.
 *
 * Node → client mapping is explicit rather than asserted: the schema is
 * camelCase and these types are snake_case, and asserting one onto the other
 * is what once rendered "Invalid Date" on every row of another screen.
 */

import { apiPost, apiPut, apiDelete } from "@/services/api";
import { gql } from "@/services/graphql";

export interface Holiday {
  id: string;
  name: string;
  description?: string | null;
  holiday_type: string;
  start_date?: string | null;
  end_date?: string | null;
  is_recurring: boolean;
  recurring_day_of_week?: number | null;
  recurring_day_name?: string | null;
  academic_year_id?: string | null;
  academic_year_name?: string | null;
  applies_to?: string;
  duration_days?: number;
  created_by?: string | null;
  created_by_name?: string | null;
  updated_by?: string | null;
  updated_by_name?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CreateHolidayPayload {
  name: string;
  holiday_type: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  is_recurring: boolean;
  recurring_day_of_week?: number;
  academic_year_id?: string;
  applies_to?: string;
}

const HOLIDAY_FIELDS = `
  id name description holidayType appliesTo
  startDate endDate isSingleDay durationDays
  isRecurring recurringDayOfWeek recurringDayName
  academicYearId academicYearName
`;

const HOLIDAYS = `
  query Holidays($first: Int!, $offset: Int, $where: HolidayFilter) {
    holidays(first: $first, offset: $offset, where: $where) {
      hasNextPage
      nodes { ${HOLIDAY_FIELDS} }
    }
  }
`;

const UPCOMING = `
  query UpcomingHolidays($limit: Int!) {
    upcomingHolidays(limit: $limit) { ${HOLIDAY_FIELDS} }
  }
`;

type HolidayNode = {
  id: string;
  name: string;
  description: string | null;
  holidayType: string | null;
  appliesTo: string | null;
  startDate: string | null;
  endDate: string | null;
  isSingleDay: boolean;
  durationDays: number | null;
  isRecurring: boolean;
  recurringDayOfWeek: number | null;
  recurringDayName: string | null;
  academicYearId: string | null;
  academicYearName: string | null;
};

function toHoliday(node: HolidayNode): Holiday {
  return {
    id: node.id,
    name: node.name,
    description: node.description,
    holiday_type: node.holidayType ?? "",
    start_date: node.startDate,
    end_date: node.endDate,
    is_recurring: node.isRecurring,
    recurring_day_of_week: node.recurringDayOfWeek,
    recurring_day_name: node.recurringDayName,
    academic_year_id: node.academicYearId,
    academic_year_name: node.academicYearName,
    applies_to: node.appliesTo ?? undefined,
    duration_days: node.durationDays ?? undefined,
  };
}

/** The server's page cap. Asking for more is trimmed, not refused. */
const MAX_PER_PAGE = 100;
/** Far past any school year's closures; a bound so a server that always says
 *  "there is more" cannot spin. */
const MAX_PAGES = 20;

export type HolidayFilters = {
  academic_year_id?: string;
  start_date?: string;
  end_date?: string;
  include_recurring?: boolean;
};

function whereFrom(params?: HolidayFilters) {
  const where: Record<string, unknown> = {};
  if (params?.academic_year_id) where.academicYearId = params.academic_year_id;
  if (params?.start_date) where.startsOnOrAfter = params.start_date;
  if (params?.end_date) where.endsOnOrBefore = params.end_date;
  if (params?.include_recurring === false) where.includeRecurring = false;
  return where;
}

export const holidayService = {
  /**
   * Every closure matching the filter.
   *
   * The calendar renders a whole year at once, so this reads on until the
   * server says there is no more rather than taking a page.
   */
  getHolidays: async (params?: HolidayFilters): Promise<Holiday[]> => {
    const where = whereFrom(params);
    const out: Holiday[] = [];
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const data = await gql<{
        holidays: { hasNextPage: boolean; nodes: HolidayNode[] };
      }>(HOLIDAYS, { first: MAX_PER_PAGE, offset: page * MAX_PER_PAGE, where });
      out.push(...data.holidays.nodes.map(toHoliday));
      if (!data.holidays.hasNextPage) return out;
    }
    console.warn(
      `Stopped reading holidays after ${MAX_PAGES} pages; the list may be incomplete.`,
    );
    return out;
  },

  getUpcoming: async (limit = 10): Promise<Holiday[]> => {
    const data = await gql<{ upcomingHolidays: HolidayNode[] }>(UPCOMING, {
      limit,
    });
    return data.upcomingHolidays.map(toHoliday);
  },

  createHoliday: async (payload: CreateHolidayPayload) =>
    apiPost<Holiday>("/api/holidays/", payload),

  updateHoliday: async (id: string, data: Partial<CreateHolidayPayload>) =>
    apiPut<Holiday>(`/api/holidays/${id}`, data),

  deleteHoliday: async (id: string) => apiDelete(`/api/holidays/${id}`),
};
