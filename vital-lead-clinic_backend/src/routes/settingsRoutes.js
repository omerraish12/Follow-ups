const express = require('express');
const {
    getSettings,
    updateClinic,
    updateProfile,
    changePassword,
    updateNotifications,
    updateBackupSettings,
    runBackup,
    updateIntegration,
    exportData,
    deleteAccount,
    uploadLogo,
    uploadProfilePhoto
} = require('../controllers/settingsController');
const { protect } = require('../middleware/auth');
const multer = require('multer');
const upload = multer();

const router = express.Router();

router.use(protect);

router.get('/', getSettings);
router.put('/clinic', updateClinic);
router.put('/profile', updateProfile);
router.put('/password', changePassword);
router.put('/notifications', updateNotifications);
router.put('/backup', updateBackupSettings);
router.post('/backup/run', runBackup);
router.post('/integrations', updateIntegration);
router.post('/export', exportData);
router.post('/clinic/logo', upload.single('logo'), uploadLogo);
router.post('/profile/photo', upload.single('photo'), uploadProfilePhoto);
router.delete('/account', deleteAccount);

module.exports = router;
