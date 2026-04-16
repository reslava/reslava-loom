import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as path from 'path';
import { loadDoc } from '../../../fs/dist/load';
import { saveDoc } from '../../../fs/dist/save';
import { getActiveLoomRoot } from '../../../fs/dist/utils';
import { generatePermanentId } from '../../../core/dist/idUtils';
import { Document } from '../../../core/dist/types';
import { findDocumentById, gatherAllDocumentIds } from '../../../fs/dist/pathUtils';

export async function finalizeCommand(tempId: string): Promise<void> {
    const loomRoot = getActiveLoomRoot();

    // 1. Find the document with the given temporary ID using pathUtils
    const docPath = await findDocumentById(loomRoot, tempId);
    if (!docPath) {
        console.error(chalk.red(`❌ Document with temporary ID '${tempId}' not found.`));
        process.exit(1);
    }

    // 2. Load the document
    const doc = await loadDoc(docPath) as Document;
    
    // 3. Validate it can be finalized
    if (doc.status !== 'draft') {
        console.error(chalk.red(`❌ Only draft documents can be finalized. Current status: ${doc.status}`));
        process.exit(1);
    }

    // 4. Gather all existing IDs in the loom for uniqueness check using pathUtils
    const existingIds = await gatherAllDocumentIds(loomRoot);

    // 5. Generate the permanent ID from the document's title
    const permanentId = generatePermanentId(doc.title, doc.type, existingIds);

    // 6. Update the document
    const updatedDoc = {
        ...doc,
        id: permanentId,
        status: 'active' as const,
        updated: new Date().toISOString().split('T')[0],
    } as Document;

    // 7. Determine new file path
    const threadPath = path.dirname(docPath);
    const newPath = path.join(threadPath, `${permanentId}.md`);

    // 8. Save the updated document to the new path
    await saveDoc(updatedDoc, newPath);

    // 9. Remove the old file
    await fs.remove(docPath);

    console.log(chalk.green(`✅ Document finalized.`));
    console.log(chalk.gray(`   Old ID: ${tempId}`));
    console.log(chalk.green(`   New ID: ${permanentId}`));
    console.log(chalk.gray(`   Path: ${newPath}`));
}