const express = require('express');
const router = express.Router();
const passport = require('passport');
const Profile = require('../../../models/Profile');
const validateObjectId = require('../../../validation/objectId');
// @route   POST api/profiles/follow/:user_id
// @desc    Add or remove following
// @access  Private
router.post(
    '/:user_id',
    passport.authenticate('jwt', { session: false }),
    (req, res, next) => {

        /*
       
        1. Every user have a profile (because when user register it also creates new empty profile)
        2. Check if authenticated user already follows profile with req.params.user_id
            Find user profile, loop through "following" array and check if there is profile with "user" equal to user_id param
              a) If yes => Remove it from array (unfollow)
              b) If not => Add it to the array (follow)
         */

        const errors = {};
        // user_id => The ID of a user to follow
        // req.user._id => ID of a user who wants to follow/unfollow
        const { user_id } = req.params;
        // Validate user_id
        const { idErrors, isValid } = validateObjectId(user_id);
        if (!isValid) {
            return res.status(400).json(idErrors);
        }

            if (req.user._id.equals(user_id)) {
                return res.status(400).json({
                    message: 'You cannot follow and unfollow your own profile'
                });
            }
            Profile.findOne({ user: req.user._id })
                .then(profile => {
                    // Find the profile to follow
                    Profile.findOne({ user: user_id }).then(someoneProfile => {
                        if (!someoneProfile) {
                            errors.noprofile = 'Profile to follow does not exists';
                            return res.status(400).json(errors);
                        }
                        // Determine to follow or unfollow
                        const index = profile.following.findIndex(follow =>
                                follow._id.equals(user_id)
                            );
                        if (index > -1) {
                            // Index was found => unfollow
                            profile.following = profile.following.filter(
                            follow => follow._id.toString() !== user_id.toString()
                            );
                            someoneProfile.followers = someoneProfile.followers.filter(
                            follower => follower._id.toString() !== profile.user.toString()
                            );
                            // Save your profile
                            profile
                                .save()
                                .then(savedProfile => {
                                    if (!savedProfile) {
                                        errors.notsaved =
                                            'There was a problem with saving your profile';
                                        return res.status(500).json(errors);
                                    }
                                    // Save someone's profile
                                    someoneProfile
                                        .save()
                                        .then(someoneSavedProfile => {
                                            if (!someoneSavedProfile) {
                                                errors.profilenotsaved =
                                                    'There was a problem with saving someones profile';
                                                return res.status(400).json(errors);
                                                return res.status(500).json(errors);
                                            }
                                            res.json({
                                                savedProfile,
                                                someoneSavedProfile
                                            });
                                        })
                                        .catch(err => next(err));
                                })
                                .catch(err => next(err));
                        } else {
                            // Index was not found => follow that profile
                            // Add profile to your following profiles
                            profile.following.unshift({ _id: user_id });
                            // Add your profile to someones followers
                            someoneProfile.followers.unshift({ _id: profile.user });
                            profile
                                .save()
                                .then(savedProfile => {
                                    if (!savedProfile) {
                                        errors.noprofile =
                                            'There was a problem with saving your profile';
                                        return res.status(500).json(errors);
                                    }
                                    someoneProfile
                                        .save()
                                        .then(someoneSavedProfile => {
                                            if (!someoneSavedProfile) {
                                                errors.profilenotsaved =
                                                    'There was a problem with saving someones profile';
                                                return res.status(500).json(errors);
                                            }
                                            res.json({
                                                savedProfile,
                                                someoneSavedProfile
                                            });
                                        })
                                        .catch(err => next(err));
                                })
                                .catch(err => next(err));
                        }
                    });
                })
                .catch(err => next(err));
        }
);
module.exports = router;