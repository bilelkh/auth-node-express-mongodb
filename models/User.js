const mongoose = require('mongoose')
const uniqueValidator = require('mongoose-unique-validator')
const bcrypt = require('bcryptjs')
const validator = require('validator')
const Guid = require('guid')
const jwt = require('jsonwebtoken')
const secret = process.env.JWT_SECRET || 'devmode'
const { Schema } = mongoose 

// filter returned values on requests
const returnFilter = (obj) => {
  let tmp = { ...obj._doc }
  tmp.password = undefined
  tmp.__v = undefined
  return tmp
}

const UserSchema = new Schema({
  _id: {
		type: String,
		default: () => Guid.raw()
	},
  name: {
    type: String,
    required: true
  },
  email: {
		type     : String,
		required : true,
		unique   : true,
		uniqueCaseInsensitive: true,
		trim     : true,
		minlength: 5,
		validate : {
			validator: (value) => validator.isEmail(value),
			message: '{VALUE} is not a valid email'
		}
  },
  password: {
		type     : String,
		required : true,
		minlength: 6
	},
  age: {
    type: Number,
    min: 1,
    max: 100,
    required: true
  },
  updated_at: {
    type: Date
  },
  created_at: {
    type: Date
  }
})

UserSchema.plugin(uniqueValidator)

UserSchema.pre('save', function (next) {
  const user = this
  user.updated_at = new Date().getTime()

  if(user.isModified('password')) {
		bcrypt.genSalt(10, (err, salt) => {
			bcrypt.hash(user.password, salt, (err, hash) => {
				user.password = hash
				next()
			})
		})
	} else {
		next()
	}
})

UserSchema.pre('update', function (next) {
	this.updated_at = new Date().getTime()
	next()
})

UserSchema.methods.toJSON = function () {
	const user = this
  const userObject = user.toObject()
  return returnFilter(userObject)
}

UserSchema.statics.findByCredentials = async function (email, password) {
  const user = this
  const doc = await user.findOne({ email })
  return new Promise((resolve, reject) => {
    if(!doc) { 
      return reject({ status: 404, message: 'Invalid credentials'})
    }
    bcrypt.compare(password, doc.password, (err, didMatch) => {
      if(err) return reject(err)
      if(didMatch) {
        resolve(returnFilter(doc))
      } else {
        reject({ message: 'Not authorized'})
      }
    })
  })
}

UserSchema.statics.findByToken = async function(token) {
	const User = this
	try {
    let decodedIdAndToken = jwt.verify(token, secret)
    let user = await User.findOne({
      _id: decodedIdAndToken._id,
    })
    return Promise.resolve(returnFilter(user))
	} catch(e) {
		return Promise.reject(e)
	}
}

mongoose.model('User', UserSchema)