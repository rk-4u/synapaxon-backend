// utils/dataLoader.js
const mongoose = require('mongoose');
const Category = require('../models/Category');
const Subject = require('../models/Subject');
const Topic = require('../models/Topic');
const config = require('../config/config');
const connectDB = require('../config/db');

// Import the data structure from questionData.js 
const { categories, subjectsByCategory, topicsBySubject } = require('../src/data/questionData');

// Function to load data from the imported structure
const loadData = async () => {
  try {
    // Connect to database
    await connectDB();
    
    console.log('Connected to database. Loading data...');
    
    // Process each category
    for (const categoryData of categories) {
      // Create or find category
      let category = await Category.findOne({ name: categoryData.name });
      
      if (!category) {
        category = await Category.create({ name: categoryData.name });
        console.log(`Created category: ${category.name}`);
      } else {
        console.log(`Found existing category: ${category.name}`);
      }
      
      // Process subjects for this category
      const subjects = subjectsByCategory[categoryData.name] || [];
      
      for (const subjectName of subjects) {
        // Format subject name - replace spaces with underscores for consistency
        const formattedSubjectName = subjectName.replace(/ /g, '_');
        
        // Create or find subject
        let subject = await Subject.findOne({ 
          name: formattedSubjectName, 
          category: category._id 
        });
        
        if (!subject) {
          subject = await Subject.create({
            name: formattedSubjectName,
            category: category._id
          });
          console.log(`Created subject: ${subject.name} in category: ${category.name}`);
        } else {
          console.log(`Found existing subject: ${subject.name}`);
        }
        
        // Process topics for this subject
        const topics = topicsBySubject[subjectName] || [];
        
        for (const topicName of topics) {
          // Format topic name - replace spaces with underscores for consistency
          const formattedTopicName = topicName.replace(/ /g, '_');
          
          // Create or find topic
          let topic = await Topic.findOne({
            name: formattedTopicName,
            subject: subject._id
          });
          
          if (!topic) {
            topic = await Topic.create({
              name: formattedTopicName,
              subject: subject._id
            });
            console.log(`Created topic: ${topic.name} in subject: ${subject.name}`);
          } else {
            console.log(`Found existing topic: ${topic.name}`);
          }
        }
      }
    }
    
    console.log('Data loading complete!');
    process.exit(0);
  } catch (error) {
    console.error('Error loading data:', error);
    process.exit(1);
  }
};

// Run the loader
loadData();

module.exports = {
  loadData
};