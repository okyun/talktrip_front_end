import axiosInstance from './mainApi';

/**
 * DauController (me)
 * - POST /api/me/dau/visit/bitmap  -> 204 No Content (or 401)
 * - POST /api/me/dau/visit/set     -> 204 No Content (or 401)
 */

export const postMyDauVisitBitmap = async () => {
  const res = await axiosInstance.post('/api/me/dau/visit/bitmap');
  return res;
};

export const postMyDauVisitSet = async () => {
  const res = await axiosInstance.post('/api/me/dau/visit/set');
  return res;
};

