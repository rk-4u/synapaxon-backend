// Run the seeder
seedDatabase();

module.exports = {
  seedDatabase
};
// utils/dataSeeder.js
const mongoose = require('mongoose');
const Category = require('../models/Category');
const Subject = require('../models/Subject');
const Topic = require('../models/Topic');
const config = require('../config/config');
const connectDB = require('../config/db');

// Sample data structure based on questionData.js
const categories = [
  { name: "Basic Sciences" },
  { name: "Organ Systems" },
  { name: "Clinical Specialties" },
];

const subjectsByCategory = {
  "Basic Sciences": [
    "Anatomy",
    "Biochemistry",
    "Biostatistics",
    "General_Principles",
    "Immunology",
    "Microbiology",
    "Pathology",
    "Pharmacology",
    "Physiology",
    "Risk_Factors_Prognosis",
    "Social_Sciences",
  ],
  "Organ Systems": [
    "Behavioral_Health",
    "Blood_Lymphatic",
    "Cardiovascular",
    "Endocrine",
    "Female_Reproductive",
    "Gastrointestinal",
    "Male_Reproductive",
    "Musculoskeletal",
    "Nervous_System",
    "Renal",
    "Respiratory",
    "Skin",
  ],
  "Clinical Specialties": [
    "Emergency_Medicine",
    "Family_Medicine",
    "Internal_Medicine",
    "Neurology",
    "Obstetrics_Gynecology",
    "Oncology",
    "Pediatrics",
    "Psychiatry",
    "Radiology",
    "Surgery",
    "Urology",
  ],
};

const topicsBySubject = {
  "Anatomy": [
    "Cerebral_Circulation",
    "Cranial_Nerves",
    "Spinal_Cord",
    "Thoracic_Cavity",
    "Abdominal_Landmarks",
  ],
  "Biochemistry": [
    "Enzymes",
    "Metabolic_Pathways",
    "DNA_Replication",
    "Protein_Synthesis",
    "Vitamins_Cofactors",
  ],
  // Additional topics for other subjects would be added here
};

// Function to seed the database
const seedDatabase = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Clear existing data
    await Topic.deleteMany();
    await Subject.deleteMany();
    await Category.deleteMany();
    
    console.log('Database cleared');
    
    // Create categories
    const categoryDocs = [];
    for (const cat of categories) {
      const category = await Category.create(cat);
      categoryDocs.push(category);
      console.log(`Created category: ${category.name}`);
    }
    
    // Create subjects for each category
    const subjectDocs = {};
    for (const category of categoryDocs) {
      const subjects = subjectsByCategory[category.name] || [];
      
      for (const subjectName of subjects) {
        const subject = await Subject.create({
          name: subjectName,
          category: category._id
        });
        
        if (!subjectDocs[category.name]) {
          subjectDocs[category.name] = [];
        }
        
        subjectDocs[category.name].push(subject);
        console.log(`Created subject: ${subject.name} in category: ${category.name}`);
      }
    }
    
    // Create topics for each subject
    for (const categoryName in subjectDocs) {
      const subjects = subjectDocs[categoryName];
      
      for (const subject of subjects) {
        const topics = topicsBySubject[subject.name] || [];
        
        for (const topicName of topics) {
          const topic = await Topic.create({
            name: topicName,
            subject: subject._id
          });
          
          console.log(`Created topic: ${topic.name} in subject: ${subject.name}`);
        }
      }
    }
    
    console.log('Database seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};