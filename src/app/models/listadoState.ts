export interface ListadoLibrosState {

    page: number;

    size: number;

    search: string;

    categoriaId: number | null;

    areaIds: number[];

    sortField: string;

    sortOrder: string;

}