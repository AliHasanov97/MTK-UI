import { apiFetch } from "./client";

export type Building = {
  id: string;
  name: string;
  fullAddress: string;
  totalFloors: number;
  apartmentsPerFloor: number;
  totalApartments: number;
  status: string;
  description?: string | null;
};

export type Apartment = {
  id: string;
  buildingId: string;
  buildingName: string;
  apartmentNumber: string;
  floor: number;
  areaSquareMeters: number;
  roomCount: number;
  status: string;
  currentOwnerId?: string | null;
  currentOwnerName?: string | null;
};

export function listBuildings(accessToken: string) {
  return apiFetch<Building[]>("api/buildings/buildings", accessToken);
}

export function getBuilding(accessToken: string, id: string) {
  return apiFetch<Building>(`api/buildings/buildings/${id}`, accessToken);
}

export function listApartmentsByBuilding(accessToken: string, buildingId: string) {
  return apiFetch<Apartment[]>(
    `api/buildings/apartments/building/${buildingId}`,
    accessToken,
  );
}
