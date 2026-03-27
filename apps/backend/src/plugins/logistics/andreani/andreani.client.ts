import axios, { AxiosInstance } from 'axios';
import { AndreaniConfig } from './andreani.config';
import { AndreaniQuoteRequest, AndreaniShipmentRequest } from './andreani.dto';
import { AndreaniQuoteResponsePayload, AndreaniShipmentResponsePayload } from './andreani.types';

export class AndreaniClient {
    private http: AxiosInstance;
    private shipmentHttp: AxiosInstance;

    constructor(private config: AndreaniConfig) {
        this.http = axios.create({
            baseURL: config.baseUrl,
            timeout: config.timeoutMs,
            headers: {
                'x-authorization-token': config.authToken,
                'Accept': 'application/json',
            },
        });
        this.shipmentHttp = axios.create({
            baseURL: config.shipmentBaseUrl,
            timeout: config.timeoutMs,
            headers: {
                'x-authorization-token': config.authToken,
                'Accept': 'application/json',
            },
        });
    }

    async quote(payload: AndreaniQuoteRequest): Promise<AndreaniQuoteResponsePayload> {
        const searchParams = new URLSearchParams();
        searchParams.append('CpDestino', payload.destinationPostalCode);
        searchParams.append('CiudadDestino', payload.destinationCity);
        if (payload.destinationCountryCode) {
            searchParams.append('PaisDestino', payload.destinationCountryCode);
        }

        searchParams.append('CpOrigen', this.config.originPostalCode);
        searchParams.append('CiudadOrigen', this.config.originCity);
        if (this.config.originCountry) {
            searchParams.append('PaisOrigen', this.config.originCountry);
        }
        if (this.config.originProvince) {
            searchParams.append('ProvinciaOrigen', this.config.originProvince);
        }

        if (this.config.contractCode) {
            searchParams.append('Contrato', this.config.contractCode);
        }
        if (this.config.clientCode) {
            searchParams.append('Cliente', this.config.clientCode);
        }
        const defaultCategory = payload.categoryId || this.config.defaultCategoryId;
        if (defaultCategory) {
            searchParams.append('bultos[0].categoriaProducto', defaultCategory);
        }
        if (payload.declaredValue) {
            searchParams.append('bultos[0].valorDeclarado', payload.declaredValue.toString());
        }
        if (payload.volume) {
            searchParams.append('bultos[0].volumen', payload.volume.toString());
        }
        if (payload.weightKg) {
            searchParams.append('bultos[0].kilos', payload.weightKg.toString());
        }
        if (payload.heightCm) {
            searchParams.append('bultos[0].altoCm', payload.heightCm.toString());
        }
        if (payload.lengthCm) {
            searchParams.append('bultos[0].largoCm', payload.lengthCm.toString());
        }
        if (payload.widthCm) {
            searchParams.append('bultos[0].anchoCm', payload.widthCm.toString());
        }

        const response = await this.http.get<AndreaniQuoteResponsePayload>(`/Cotizador?${searchParams.toString()}`);
        return response.data;
    }

    async createShipment(payload: AndreaniShipmentRequest): Promise<AndreaniShipmentResponsePayload> {
        const response = await this.shipmentHttp.post<AndreaniShipmentResponsePayload>('/ordenes-de-envio', payload);
        return response.data;
    }
}
