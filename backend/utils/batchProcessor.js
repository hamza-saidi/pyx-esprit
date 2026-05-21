/**
 * Batch processing utility for large datasets
 * Helps avoid MySQL packet size limits and memory issues
 */

class BatchProcessor {
  constructor(batchSize = 100) {
    this.batchSize = batchSize;
  }

  /**
   * Process data in batches with progress tracking
   * @param {Array} data - Array of items to process
   * @param {Function} processBatch - Function to process each batch
   * @param {Function} onProgress - Optional progress callback
   * @returns {Promise<Array>} - Array of all processed results
   */
  async processInBatches(data, processBatch, onProgress = null) {
    const results = [];
    const totalBatches = Math.ceil(data.length / this.batchSize);
    
    console.log(`Processing ${data.length} items in ${totalBatches} batches of ${this.batchSize}...`);
    
    for (let i = 0; i < data.length; i += this.batchSize) {
      const batchNumber = Math.floor(i / this.batchSize) + 1;
      const batch = data.slice(i, i + this.batchSize);
      
      console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} items)`);
      
      try {
        const batchResults = await processBatch(batch, batchNumber, totalBatches);
        results.push(...batchResults);
        
        console.log(`✅ Batch ${batchNumber}/${totalBatches} completed successfully`);
        
        // Call progress callback if provided
        if (onProgress) {
          const progress = {
            batchNumber,
            totalBatches,
            itemsProcessed: Math.min(i + this.batchSize, data.length),
            totalItems: data.length,
            percentage: Math.round(((i + this.batchSize) / data.length) * 100)
          };
          onProgress(progress);
        }
        
      } catch (error) {
        console.error(`❌ Error in batch ${batchNumber}/${totalBatches}:`, error);
        throw new Error(`Failed to process batch ${batchNumber}/${totalBatches}: ${error.message}`);
      }
    }
    
    console.log(`🎉 All ${totalBatches} batches completed successfully!`);
    return results;
  }

  /**
   * Process contacts with category/distribution/tag creation
   * @param {Array} contacts - Array of contact data
   * @param {Object} models - Sequelize models
   * @returns {Promise<Array>} - Array of created contacts
   */
  async processContacts(contacts, models) {
    const { Contact, Category, Distribution, Tag } = models;
    
    return this.processInBatches(contacts, async (batch, batchNumber, totalBatches) => {
      // Create contacts in this batch
      const createdContacts = await Contact.bulkCreate(batch);
      
      // Process associations for this batch
      for (let i = 0; i < createdContacts.length; i++) {
        const contact = createdContacts[i];
        const contactData = batch[i];
        
        // Associate tags if present - need to fetch Tag instances first
        if (contactData._tagIds && contactData._tagIds.length > 0) {
          const tagInstances = await Tag.findAll({ where: { id: contactData._tagIds } });
          if (tagInstances.length > 0) {
            await contact.addTags(tagInstances);
          }
        }
      }
      
      return createdContacts;
    }, (progress) => {
      console.log(`📊 Progress: ${progress.percentage}% (${progress.itemsProcessed}/${progress.totalItems})`);
    });
  }

  /**
   * Get optimal batch size based on data size
   * @param {number} totalItems - Total number of items
   * @returns {number} - Recommended batch size
   */
  static getOptimalBatchSize(totalItems) {
    if (totalItems <= 1000) return 100;
    if (totalItems <= 10000) return 50;
    if (totalItems <= 50000) return 25;
    return 10; // For very large datasets
  }
}

module.exports = BatchProcessor;


