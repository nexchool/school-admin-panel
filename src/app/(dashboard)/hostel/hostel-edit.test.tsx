/**
 * Editing a hostel from the rooms screen.
 *
 * The hostel's warden name and phone are shown in this screen's header, and
 * until now there was no way to correct them once the hostel existed. These
 * tests cover the entry point and the PATCH it sends — particularly that a
 * cleared field is sent as null rather than omitted, since an omitted key on a
 * PATCH means "leave unchanged".
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import RoomsGridPage from "./[hostelId]/page";
import { hostelService } from "@/services/hostelService";
import type { Hostel } from "@/services/hostelService";

vi.mock("next/navigation", () => ({
  useParams: () => ({ hostelId: "h-1" }),
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/services/hostelService", () => ({
  hostelService: {
    getHostel: vi.fn(),
    updateHostel: vi.fn(),
    listRooms: vi.fn(),
    listAllocations: vi.fn(),
    createRoom: vi.fn(),
  },
}));

vi.mock("@/components/providers/AuthProvider", () => ({
  useAuth: () => ({ tenantId: "tenant-1", hasPermission: () => true }),
}));

vi.mock("@/lib/errorToast", () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const HOSTEL: Hostel = {
  id: "h-1",
  name: "Boys Hostel A",
  capacity: 120,
  warden_name: "Mr. Iyer",
  warden_phone: "9876543210",
  address: "North Campus, Block B",
  status: "active",
} as Hostel;

/** Render the screen and wait for the hostel to load. */
async function renderScreen() {
  render(<RoomsGridPage />, { wrapper });
  expect(await screen.findByText(/Boys Hostel A/)).toBeInTheDocument();
}

/** Open the edit dialog and return the warden phone input. */
async function openEditDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /edit/i }));
  return screen.getByLabelText(/warden phone/i);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(hostelService.getHostel).mockResolvedValue(HOSTEL);
  vi.mocked(hostelService.listRooms).mockResolvedValue([]);
  vi.mocked(hostelService.listAllocations).mockResolvedValue([]);
  vi.mocked(hostelService.updateHostel).mockResolvedValue(HOSTEL);
});

describe("hostel edit entry point", () => {
  it("shows the warden's name and phone in the header", async () => {
    await renderScreen();
    expect(screen.getByText(/Mr\. Iyer/)).toBeInTheDocument();
    expect(screen.getByText(/9876543210/)).toBeInTheDocument();
  });

  it("opens the dialog in edit mode, populated with the hostel's details", async () => {
    const user = userEvent.setup();
    await renderScreen();

    const phone = await openEditDialog(user);

    expect(screen.getByRole("heading", { name: /edit hostel/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save changes/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^name$/i)).toHaveValue("Boys Hostel A");
    expect(screen.getByLabelText(/warden name/i)).toHaveValue("Mr. Iyer");
    expect(phone).toHaveValue("9876543210");
  });
});

describe("saving an edited hostel", () => {
  it("sends the edited values", async () => {
    const user = userEvent.setup();
    await renderScreen();

    const phone = await openEditDialog(user);
    await user.clear(phone);
    await user.type(phone, "9812345678");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(hostelService.updateHostel).toHaveBeenCalledWith(
        "h-1",
        expect.objectContaining({ warden_phone: "9812345678" })
      );
    });
  });

  it("sends null for a cleared field, so it can actually be removed", async () => {
    const user = userEvent.setup();
    await renderScreen();

    const phone = await openEditDialog(user);
    await user.clear(phone);
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => {
      expect(hostelService.updateHostel).toHaveBeenCalled();
    });
    const patch = vi.mocked(hostelService.updateHostel).mock.calls[0][1];
    expect(patch.warden_phone).toBeNull();
    expect("warden_phone" in patch).toBe(true);
  });

  it("does not save an invalid warden phone", async () => {
    const user = userEvent.setup();
    await renderScreen();

    const phone = await openEditDialog(user);
    await user.clear(phone);
    await user.type(phone, "abcdefghij");
    await user.click(screen.getByRole("button", { name: /save changes/i }));

    expect(
      await screen.findByText(/enter a valid 10-digit mobile number/i)
    ).toBeInTheDocument();
    expect(hostelService.updateHostel).not.toHaveBeenCalled();
  });
});
