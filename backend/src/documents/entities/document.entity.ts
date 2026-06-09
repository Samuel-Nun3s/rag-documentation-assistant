import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type DocumentStatus = 'processing' | 'ready' | 'error';
export type DocumentSource = 'upload' | 'github';

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'varchar' })
  status: DocumentStatus;

  @Column({ type: 'varchar' })
  source: DocumentSource;

  @Column({ nullable: true })
  mimeType: string;

  @Column({ default: 0 })
  chunkCount: number;

  @Column({ nullable: true, type: 'text' })
  errorMessage: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
