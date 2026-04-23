import { api } from "@/redux/api/apiSlice";

// Types
export interface Geofence {
  _id: string;
  name: string;
  type: "circle" | "polygon";
  center?: {
    type: "Point";
    coordinates: [number, number]; // [lng, lat]
  };
  radius?: number;
  polygon?: {
    type: "Polygon";
    coordinates: number[][][];
  };
  isActive: boolean;
  createdAt: string;
}

export type CreateGeofenceDto = Omit<Geofence, "_id" | "createdAt" | "isActive">;
export type UpdateGeofenceDto = Partial<CreateGeofenceDto>;


export const geofenceApi = api.injectEndpoints({

  endpoints: (builder) => ({
    // GET all geofences
    getGeofences: builder.query<Geofence[], void>({
      query: () => "geofences",
    }),
  }),
});

export const {
  useGetGeofencesQuery,
} = geofenceApi;
