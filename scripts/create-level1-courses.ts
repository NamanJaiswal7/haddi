import axios from 'axios';

const API_BASE_URL = 'http://localhost:4545/api/master-admin';

// Master admin token - you'll need to replace this with a valid token
const MASTER_ADMIN_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImNtZTRpdXBwbTAwMWlxb3JxN3FmdW1pMjciLCJyb2xlIjoibWFzdGVyX2FkbWluIiwiZGlzdHJpY3RJZCI6bnVsbCwiaWF0IjoxNzU0ODE0NjkwLCJleHAiOjE3NTU0MTk0OTB9.1CLlBv2KypEtxg2BPwJBgpMgmuXDRo3HI0gadixzFCE';

const headers = {
  'Authorization': `Bearer ${MASTER_ADMIN_TOKEN}`,
  'Content-Type': 'application/json'
};

async function createLevel1Courses() {
  try {
    console.log('🚀 Starting to create Level 1 courses for all classes...');

    // Helper function to add video
    const addVideo = async (classLevel: string, title: string, iframeSnippet: string) => {
      try {
        const response = await axios.post(`${API_BASE_URL}/courses/videos`, {
          class: classLevel,
          level: 'Level 1',
          title,
          iframeSnippet
        }, { headers });
        console.log(`✅ Added video: ${title}`);
        return response.data;
             } catch (error: any) {
         console.error(`❌ Error adding video ${title}:`, error.response?.data || error.message);
         throw error;
       }
    };

    // Helper function to add note
    const addNote = async (classLevel: string, title: string, url: string) => {
      try {
        const response = await axios.post(`${API_BASE_URL}/courses/notes`, {
          class: classLevel,
          level: 'Level 1',
          title,
          url
        }, { headers });
        console.log(`✅ Added note: ${title}`);
        return response.data;
             } catch (error: any) {
         console.error(`❌ Error adding note ${title}:`, error.response?.data || error.message);
         throw error;
       }
    };

    // Class 6, 7, 8 - Same content
    const classes6to8 = ['6th', '7th', '8th'];
    const videos6to8 = [
      {
        title: 'भगवद् गीता प्रतियोगिता | Level 1 : Class 6-8 Part 1',
        iframeSnippet: '<iframe width="560" height="315" src="https://www.youtube.com/embed/f_JMJS2N3gc?si=DWb0hESIv-Al7THS" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>'
      },
      {
        title: 'भगवद् गीता प्रतियोगिता | Level 1 : Class 6-8 Part 2',
        iframeSnippet: '<iframe width="560" height="315" src="https://www.youtube.com/embed/rl7xYT5xwzI?si=DbtBVEARprfUUTJN" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>'
      }
    ];

    const note6to8 = {
      title: 'भगवद् गीता प्रतियोगिता | Level 1 : Class 6-8',
      url: 'https://drive.google.com/drive/folders/1XDpnW4UXz0Ci7VIgNuy73UbjfZPqYR9w?usp=drive_link'
    };

    for (const classLevel of classes6to8) {
      console.log(`\n📚 Creating content for Class ${classLevel}...`);
      
      // Add videos
      for (const video of videos6to8) {
        await addVideo(classLevel, video.title, video.iframeSnippet);
      }
      
      // Add note
      await addNote(classLevel, note6to8.title, note6to8.url);
      
      console.log(`✅ Completed Class ${classLevel}`);
    }

    // Class 9, 10, 11, 12 - Same content
    const classes9to12 = ['9th', '10th', '11th', '12th'];
    const videos9to12 = [
      {
        title: 'भगवद् गीता प्रतियोगिता | Level 1 : Class 9-12 Part 1',
        iframeSnippet: '<iframe width="560" height="315" src="https://www.youtube.com/embed/8rrbGtEzIQQ?si=UHjqtvqkCNATDepT" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>'
      },
      {
        title: 'भगवद् गीता प्रतियोगिता | Level 1 : Class 9-12 Part 2',
        iframeSnippet: '<iframe width="560" height="315" src="https://www.youtube.com/embed/6yD3vcxma3Q?si=OlGykwu4W0Y4NQu_" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>'
      },
      {
        title: 'भगवद् गीता प्रतियोगिता | Level 1 : Class 9-12 Part 3',
        iframeSnippet: '<iframe width="560" height="315" src="https://www.youtube.com/embed/bMrhtnYw71s?si=P7U9P5CtuAfSEXI9" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>'
      }
    ];

    const note9to12 = {
      title: 'भगवद् गीता प्रतियोगिता | Level 1 : Class 9-12',
      url: 'https://drive.google.com/drive/folders/1zjI9orSf_uRjxJKx4HgdgjIZlvxcogwx?usp=drive_link'
    };

    for (const classLevel of classes9to12) {
      console.log(`\n📚 Creating content for Class ${classLevel}...`);
      
      // Add videos
      for (const video of videos9to12) {
        await addVideo(classLevel, video.title, video.iframeSnippet);
      }
      
      // Add note
      await addNote(classLevel, note9to12.title, note9to12.url);
      
      console.log(`✅ Completed Class ${classLevel}`);
    }

    // College, UG, PG, PhD, Working, Others - Same content
    const collegeClasses = ['college', 'UG', 'PG', 'PhD', 'working', 'others'];
    const collegeVideos = [
      {
        title: 'भगवद् गीता प्रतियोगिता | Level 1 : College Part 1',
        iframeSnippet: '<iframe width="560" height="315" src="https://www.youtube.com/embed/wUSzhuWDdDc?si=Rq1wV3TL2fsYHXgw" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>'
      },
      {
        title: 'भगवद् गीता प्रतियोगिता | Level 1 : College Part 2',
        iframeSnippet: '<iframe width="560" height="315" src="https://www.youtube.com/embed/KmxTsHAuZpM?si=-wLE1AZAaufug0Vx" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>'
      }
    ];

    const collegeNote = {
      title: 'भगवद् गीता प्रतियोगिता | Level 1 : College',
      url: 'https://drive.google.com/drive/folders/1NYm2vEGIAVYBGpU3tubdd8VxMgV70F7-?usp=drive_link'
    };

    for (const classLevel of collegeClasses) {
      console.log(`\n📚 Creating content for ${classLevel}...`);
      
      // Add videos
      for (const video of collegeVideos) {
        await addVideo(classLevel, video.title, video.iframeSnippet);
      }
      
      // Add note
      await addNote(classLevel, collegeNote.title, collegeNote.url);
      
      console.log(`✅ Completed ${classLevel}`);
    }

    console.log('\n🎉 Successfully created Level 1 courses for all classes!');
    console.log('\n📊 Summary:');
    console.log('- Classes 6-8: 2 videos + 1 note');
    console.log('- Classes 9-12: 3 videos + 1 note');
    console.log('- College/UG/PG/PhD/Working/Others: 2 videos + 1 note');
    console.log('\n⚠️  IMPORTANT: Make sure to replace MASTER_ADMIN_TOKEN with a valid token before running!');

  } catch (error: any) {
    console.error('❌ Error creating Level 1 courses:', error);
  }
}

createLevel1Courses(); 