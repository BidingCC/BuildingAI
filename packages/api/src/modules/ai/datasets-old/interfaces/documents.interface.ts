export class CreateDocumentResponseDto {
    /**
     * Created document list
     */
    documents: any[]; // Using any[] here because DatasetsDocument is determined at runtime

    /**
     * Number of successfully created documents
     */
    createdCount: number;

    /**
     * Total number of segments
     */
    totalSegments: number;

    /**
     * Processing time (milliseconds)
     */
    processingTime: number;
}
