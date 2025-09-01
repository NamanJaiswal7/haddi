# Level 1 Course Creation Script

This script creates complete Level 1 courses for the भगवद् गीता प्रतियोगिता (Bhagavad Gita Competition) platform.

## What it creates:

### 1. Courses
- Creates courses for all class levels (6th, 7th, 8th, 9th, 10th, 11th, 12th, college, UG, PG, PhD, working, others)
- Each course is published and ready for students

### 2. Course Content
- **Classes 6-8**: 2 videos + 1 note
- **Classes 9-12**: 3 videos + 1 note  
- **College/UG/PG/PhD/Working/Others**: 2 videos + 1 note

### 3. Quizzes
- **Classes 6-8**: 3 questions (easy difficulty)
- **Classes 9-12**: 5 questions (easy + medium + hard difficulty)
- **College level**: 6 questions (easy + medium + hard difficulty)
- Passing requirement: 70%
- Quiz shows 5 questions randomly from the question bank

### 4. Schedules
- Level 1 unlocks on **January 15, 2025**
- All classes unlock at the same time

### 5. Quiz Validity
- Quizzes are valid until **December 31, 2025**
- Students must complete quizzes within this timeframe

## Prerequisites

1. **Database**: PostgreSQL database with Prisma schema
2. **Environment Variables**: 
   - `DATABASE_URL` - PostgreSQL connection string
3. **Dependencies**: Node.js and npm packages installed

## How to Run

### Option 1: Using the shell script (Recommended)
```bash
# From project root directory
./scripts/run-create-level1.sh
```

### Option 2: Manual execution
```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run the script
npx ts-node scripts/create-level1-courses.ts
```

### Option 3: Using npm script
```bash
# Add this to package.json scripts section:
# "create:level1": "ts-node scripts/create-level1-courses.ts"

# Then run:
npm run create:level1
```

## Configuration

You can modify the following constants in the script:

```typescript
const UNLOCK_DATE = new Date('2025-01-15T00:00:00Z'); // When Level 1 unlocks
const QUIZ_VALID_UNTIL = new Date('2025-12-31T23:59:59Z'); // Quiz validity period
const PASS_PERCENTAGE = 70.0; // Passing requirement percentage
```

## Database Tables Created/Updated

- `Course` - Course information
- `CourseVideo` - Video content
- `CourseNote` - Note content  
- `QuestionBank` - Question collections
- `Question` - Individual quiz questions
- `Quiz` - Quiz configuration
- `LevelSchedule` - When levels unlock
- `QuizValidity` - Quiz validity periods

## Error Handling

- **Duplicate Prevention**: Script handles existing courses gracefully
- **Database Validation**: Ensures all required relationships are created
- **Rollback**: If any step fails, the script stops and reports the error
- **Connection Management**: Properly closes database connections

## Output

The script provides detailed logging:
- ✅ Success messages for each created item
- ℹ️ Information about existing items
- ❌ Error messages with details
- 📊 Summary of all created content

## Troubleshooting

### Common Issues:

1. **Database Connection Error**
   - Check `DATABASE_URL` in `.env` file
   - Ensure database is running and accessible

2. **Prisma Client Error**
   - Run `npx prisma generate` to regenerate client
   - Check if schema.prisma is up to date

3. **Permission Denied**
   - Make shell script executable: `chmod +x scripts/run-create-level1.sh`

4. **TypeScript Compilation Error**
   - Ensure all dependencies are installed: `npm install`
   - Check TypeScript version compatibility

## Production Usage

This script is production-ready and can be used to:
- Set up new environments
- Update existing course content
- Reset course data
- Migrate between environments

## Safety Features

- **Idempotent**: Can be run multiple times safely
- **Transaction Safe**: Database operations are atomic
- **Validation**: Checks data integrity before creation
- **Logging**: Comprehensive logging for audit trails
